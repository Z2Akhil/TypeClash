// server/socket/socketHandler.js

const { generateRandomText } = require('../utils/textGenerator');
const { customAlphabet } = require('nanoid');
const Match = require('../models/Match');
const User = require('../models/User');

const generateRoomCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);
const rooms = {}; // In-memory store for active rooms

module.exports = (io) => {
    io.on('connection', (socket) => {
        socket.on('authenticate', async (firebaseUid) => {
            const user = await User.findOne({ firebaseUid }).select('username profileId');
            if (user) {
                socket.userData = {
                    username: user.username,
                    profileId: user.profileId,
                    _id: user._id
                };
                console.log(`Socket Authenticated: ${socket.id} as ${user.username}`);
            }
        });

        const leaveRoomHandler = (socket) => {
            const roomCode = Object.keys(rooms).find(code => rooms[code].players[socket.id]);
            if (!roomCode) return;

            const room = rooms[roomCode];
            const player = room.players[socket.id];
            if (!player) return;

            const wasHost = player.isHost;
            delete room.players[socket.id];
            socket.leave(roomCode);

            if (Object.keys(room.players).length === 0) {
                delete rooms[roomCode];
            } else {
                if (wasHost) {
                    const newHostSocketId = Object.keys(room.players)[0];
                    if (room.players[newHostSocketId]) {
                       room.players[newHostSocketId].isHost = true;
                    }
                }
                io.to(roomCode).emit('roomUpdate', room);
            }
        };

        socket.on('createRoom', ({ difficulty }) => {
            if (!socket.userData) return;
            const roomCode = generateRoomCode();
            socket.join(roomCode);
            rooms[roomCode] = {
                roomCode,
                players: {
                    [socket.id]: {
                        id: socket.userData.profileId,
                        ...socket.userData,
                        isHost: true,
                    }
                },
                status: 'waiting',
                difficulty: difficulty,
            };
            io.to(roomCode).emit('roomUpdate', rooms[roomCode]);
        });

        socket.on('joinRoom', ({ roomCode }) => {
            if (!socket.userData) return;
            const room = rooms[roomCode];
            if (room && room.status === 'waiting' && Object.keys(room.players).length < 6) {
                socket.join(roomCode);
                room.players[socket.id] = {
                    id: socket.userData.profileId,
                    ...socket.userData,
                    isHost: false,
                };
                io.to(roomCode).emit('roomUpdate', room);
            } else {
                socket.emit('error', { message: 'Cannot join room.' });
            }
        });

        // ✅ FIXED startGame LOGIC
        socket.on('startGame', ({ roomCode }) => {
            const room = rooms[roomCode];
            if (!room || !room.players[socket.id]?.isHost || room.status !== 'waiting') return;

            // Check if this is a rematch by seeing if any player has opted in.
            const isRematch = Object.values(room.players).some(p => p.wantsToPlayAgain);

            let playersForThisRound;

            if (isRematch) {
                // If it's a rematch, filter for players who opted in.
                playersForThisRound = Object.entries(room.players)
                    .filter(([socketId, player]) => player.wantsToPlayAgain)
                    .reduce((obj, [socketId, player]) => {
                        obj[socketId] = player;
                        return obj;
                    }, {});
            } else {
                // If it's a new game, include everyone currently in the lobby.
                playersForThisRound = room.players;
            }

            // Abort if no players are left or if the host isn't in the group.
            if (Object.keys(playersForThisRound).length === 0 || !playersForThisRound[socket.id]) {
                return;
            }

            // The room's official player list is now the correct set of players for this round.
            room.players = playersForThisRound;

            // Ensure a host exists among the remaining players (important for rematches).
            if (!Object.values(room.players).some(p => p.isHost)) {
                room.players[socket.id].isHost = true;
            }

            // Reset stats ONLY for the players who are continuing.
            Object.values(room.players).forEach(player => {
                player.progress = 0;
                player.wpm = 0;
                player.isFinished = false;
                player.finalStats = null;
                player.wantsToPlayAgain = false; // Reset for the *next* potential rematch
            });
            
            const text = generateRandomText(room.difficulty);
            room.status = 'in-progress';
            room.promptText = text;
            room.startTime = Date.now();

            // Broadcast the final, correct state to start the game.
            io.to(roomCode).emit('roomUpdate', room); 
            io.to(roomCode).emit('gameStarted', { text, startTime: room.startTime });
        });

        socket.on('userInput', ({ roomCode, progress, wpm }) => {
            const room = rooms[roomCode];
            if (room && room.players[socket.id]) {
                const player = room.players[socket.id];
                player.progress = progress;
                player.wpm = wpm;
                io.to(roomCode).emit('playerProgress', { id: socket.id, progress, wpm });
            }
        });

        // ✅ FIXED 'finishGame' handler
            socket.on('finishGame', async ({ roomCode, accuracy, errorCount, timeTaken }) => { // Removed 'wpm' from payload
                const room = rooms[roomCode];
                if (!room || !socket.userData) return;

                const player = room.players[socket.id];
                if (!player || player.isFinished) return; // Ignore if no player or already finished

                // KEY CHANGE: Use the WPM value the server has been tracking from 'userInput' events.
                const finalWPM = player.wpm;

                player.isFinished = true;
                // Use the server's authoritative WPM for the final stats.
                player.finalStats = { user: socket.userData._id, username: socket.userData.username, wpm: finalWPM, accuracy, errorCount, timeTaken };

                io.to(roomCode).emit('playerFinished', { id: socket.id, finalStats: player.finalStats });

                const allActivePlayers = Object.values(room.players);
                const allFinished = allActivePlayers.every(p => p.isFinished);

                if (allFinished) {
                    room.status = 'finished'; // Mark status as finished
                    const results = allActivePlayers.map(p => p.finalStats).filter(Boolean); // Ensure no nulls
                    results.sort((a, b) => b.wpm - a.wpm);

                    const match = new Match({
                        gameMode: 'multiplayer',
                        roomCode,
                        difficulty: room.difficulty,
                        promptText: room.promptText,
                        players: results,
                        winner: results.length > 0 ? results[0].user : null,
                    });
                    await match.save();

                    // Reset player "wantsToPlayAgain" state for the next round
                    allActivePlayers.forEach(p => p.wantsToPlayAgain = false);

                    io.to(roomCode).emit('gameFinished', { results, matchId: match._id, room: { roomCode: room.roomCode } });
                }
            });

        // ✅ NEW 'play-again' LOGIC
        socket.on('play-again', ({ roomCode }) => {
            if (!socket.userData) return;
            const room = rooms[roomCode];
            if (!room || !room.players[socket.id]) return;

            // FIX: Allow players to join for a rematch as long as the game is over.
            // The status can be 'finished' (for the first player) or 'waiting' (for subsequent players).
            if (room.status === 'finished' || room.status === 'waiting') {
                
                // If this is the first player to click, flip the status.
                if (room.status === 'finished') {
                    room.status = 'waiting';
                }

                room.players[socket.id].wantsToPlayAgain = true;

                // Tell client it's okay to navigate to lobby
                socket.emit('rematch-ready', { roomCode });

                // Let everyone else in the room know this player is ready
                // This will update the lobby for players who are already there.
                io.to(roomCode).emit('roomUpdate', room);
            }
        });

        socket.on('leaveRoom', ({ roomCode }) => {
            leaveRoomHandler(socket);
        });

        socket.on('disconnect', () => {
            leaveRoomHandler(socket);
        });

        socket.on('getRoomState', ({ roomCode }) => {
             const room = rooms[roomCode];
             if (room) {
                 socket.emit('roomUpdate', room);
             }
        });
    });
};