// server/socket/socketHandler.js

const { generateRandomText } = require('../utils/textGenerator');
const { customAlphabet } = require('nanoid');
const Match = require('../models/Match');
const User = require('../models/User');
const admin = require('../config/firebaseAdmin');

const generateRoomCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);
const rooms = {}; // In-memory store for active rooms

module.exports = (io) => {
    io.on('connection', (socket) => {
        socket.on('authenticate', async (idToken) => {
            try {
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                const user = await User.findOne({ firebaseUid: decodedToken.uid }).select('username profileId');
                if (user) {
                    socket.userData = {
                        username: user.username,
                        profileId: user.profileId,
                        _id: user._id,
                        firebaseUid: decodedToken.uid
                    };
                    console.log(`Socket Authenticated: ${socket.id} as ${user.username}`);
                    socket.emit('authenticated', { username: user.username });
                }
            } catch (error) {
                console.error('Socket authentication error:', error);
                socket.emit('error', { message: 'Authentication failed.' });
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
                    const nextSocketId = Object.keys(room.players)[0];
                    if (room.players[nextSocketId]) {
                        room.players[nextSocketId].isHost = true;
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
                        id: socket.userData.profileId, // Add for compatibility
                        profileId: socket.userData.profileId,
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
            if (!room) {
                return socket.emit('error', { message: 'Room not found.' });
            }

            // Check if user is already in the room (even with another socket ID)
            const existingSocketId = Object.keys(room.players).find(
                sId => room.players[sId].profileId === socket.userData.profileId
            );

            if (existingSocketId) {
                const wasHost = room.players[existingSocketId].isHost;
                delete room.players[existingSocketId];
                room.players[socket.id] = {
                    profileId: socket.userData.profileId,
                    ...socket.userData,
                    isHost: wasHost
                };
            } else if (room.status === 'waiting' && Object.keys(room.players).length < 6) {
                room.players[socket.id] = {
                    profileId: socket.userData.profileId,
                    ...socket.userData,
                    isHost: false,
                };
            } else {
                return socket.emit('error', { message: 'Cannot join room.' });
            }

            socket.join(roomCode);
            io.to(roomCode).emit('roomUpdate', room);
        });

        socket.on('startGame', ({ roomCode }) => {
            const room = rooms[roomCode];
            const player = socket.userData ? Object.values(room?.players || {}).find(p => p.profileId === socket.userData.profileId) : null;

            if (!room || !player?.isHost || room.status !== 'waiting') return;

            const isRematch = Object.values(room.players).some(p => p.wantsToPlayAgain);
            let playersForThisRound;

            if (isRematch) {
                playersForThisRound = Object.entries(room.players)
                    .filter(([sId, p]) => p.wantsToPlayAgain)
                    .reduce((obj, [sId, p]) => {
                        obj[sId] = p;
                        return obj;
                    }, {});
            } else {
                playersForThisRound = room.players;
            }

            if (Object.keys(playersForThisRound).length === 0) return;
            room.players = playersForThisRound;

            if (!Object.values(room.players).some(p => p.isHost)) {
                const firstId = Object.keys(room.players)[0];
                room.players[firstId].isHost = true;
            }

            Object.values(room.players).forEach(p => {
                p.progress = 0;
                p.wpm = 0;
                p.isFinished = false;
                p.finalStats = null;
                p.wantsToPlayAgain = false;
            });

            const text = generateRandomText(room.difficulty);
            room.status = 'in-progress';
            room.promptText = text;
            room.startTime = Date.now();

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

        socket.on('finishGame', async ({ roomCode, userInput, timeTaken }) => {
            const room = rooms[roomCode];
            if (!room || !socket.userData) return;

            const player = room.players[socket.id];
            if (!player || player.isFinished) return;

            const promptText = room.promptText;
            const userText = userInput || "";

            let errors = 0;
            const minLength = Math.min(promptText.length, userText.length);
            for (let i = 0; i < minLength; i++) {
                if (promptText[i] !== userText[i]) errors++;
            }
            errors += Math.abs(promptText.length - userText.length);

            const accuracy = Math.round((Math.max(0, promptText.length - errors) / promptText.length) * 100);
            const finalWPM = timeTaken > 0 ? Math.round(((userText.length / 5) / (timeTaken / 60))) : 0;

            player.isFinished = true;
            player.finalStats = {
                user: socket.userData._id,
                username: socket.userData.username,
                wpm: finalWPM,
                accuracy,
                errorCount: errors,
                timeTaken
            };

            io.to(roomCode).emit('playerFinished', { id: socket.id, finalStats: player.finalStats });

            const allActivePlayers = Object.values(room.players);
            if (allActivePlayers.every(p => p.isFinished)) {
                room.status = 'finished';
                const results = allActivePlayers.map(p => p.finalStats).filter(Boolean).sort((a, b) => b.wpm - a.wpm);

                const match = new Match({
                    gameMode: 'multiplayer',
                    roomCode,
                    difficulty: room.difficulty,
                    promptText: room.promptText,
                    players: results,
                    winner: results.length > 0 ? results[0].user : null,
                });
                await match.save();

                allActivePlayers.forEach(p => p.wantsToPlayAgain = false);
                io.to(roomCode).emit('gameFinished', { results, matchId: match._id, room: { roomCode: room.roomCode } });
            }
        });

        socket.on('play-again', ({ roomCode }) => {
            if (!socket.userData) return;
            const room = rooms[roomCode];
            if (!room || !room.players[socket.id]) return;

            if (room.status === 'finished' || room.status === 'waiting') {
                if (room.status === 'finished') room.status = 'waiting';
                room.players[socket.id].wantsToPlayAgain = true;
                socket.emit('rematch-ready', { roomCode });
                io.to(roomCode).emit('roomUpdate', room);
            }
        });

        socket.on('leaveRoom', ({ roomCode }) => leaveRoomHandler(socket));
        socket.on('disconnect', () => leaveRoomHandler(socket));
        socket.on('getRoomState', ({ roomCode }) => {
            const room = rooms[roomCode];
            if (room) {
                if (socket.userData && !room.players[socket.id]) {
                    const existingSocketId = Object.keys(room.players).find(
                        sId => room.players[sId].profileId === socket.userData.profileId
                    );
                    if (existingSocketId) {
                        const wasHost = room.players[existingSocketId].isHost;
                        delete room.players[existingSocketId];
                        room.players[socket.id] = {
                            profileId: socket.userData.profileId,
                            ...socket.userData,
                            isHost: wasHost
                        };
                        socket.join(roomCode);
                    }
                }
                socket.emit('roomUpdate', room);
            }
        });
    });
};