import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import PlayerProgressBar from '../components/game/ProgressBar';
import Card from 'react-bootstrap/Card';

const GameRoom = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const socket = useSocket();

  // Initialize text from location state if available (passed from GameLobby)
  const initialRoom = location.state?.room || null;
  const initialText = initialRoom?.promptText || '';

  const [room, setRoom] = useState(initialRoom);
  const [text, setText] = useState(initialText);
  const [userInput, setUserInput] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [countdown, setCountdown] = useState(initialText ? 5 : null); // Start countdown if we have text
  const [gameStarted, setGameStarted] = useState(false);
  const [inactiveTimeout, setInactiveTimeout] = useState(null);
  const inputRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handlePlayerProgress = (data) => {
      setRoom((prevRoom) => {
        if (!prevRoom) return prevRoom;
        const newPlayers = { ...prevRoom.players };
        if (newPlayers[data.id]) {
          newPlayers[data.id] = { ...newPlayers[data.id], ...data };
        }
        return { ...prevRoom, players: newPlayers };
      });
    };

    const handleGameStarted = (data) => {
      setText(data.text);
      setCountdown(5); // 5-second countdown
    };

    const handleGameFinished = (data) => {
      navigate(`/results/${data.matchId}`, {
        state: { results: data.results, room: room },
      });
    };

    const handlePlayerDisconnected = (data) => {
      setRoom((prevRoom) => {
        if (!prevRoom) return prevRoom;
        const newPlayers = { ...prevRoom.players };
        delete newPlayers[data.id];
        return { ...prevRoom, players: newPlayers };
      });
    };

    socket.on('playerProgress', handlePlayerProgress);
    socket.on('gameStarted', handleGameStarted);
    socket.on('gameFinished', handleGameFinished);
    socket.on('playerDisconnected', handlePlayerDisconnected);

    return () => {
      socket.off('playerProgress', handlePlayerProgress);
      socket.off('gameStarted', handleGameStarted);
      socket.off('gameFinished', handleGameFinished);
      socket.off('playerDisconnected', handlePlayerDisconnected);
    };
  }, [socket, navigate, room]);

  // Countdown logic - 5 second countdown
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setGameStarted(true);
      startTimeRef.current = Date.now();
      inputRef.current?.focus();
    }
  }, [countdown]);

  // Inactive player timeout - if game doesn't finish in 3 minutes, auto-finish
  useEffect(() => {
    if (gameStarted && !isFinished) {
      const timeout = setTimeout(() => {
        setInactiveTimeout(true);
        // Auto-submit current progress if game is taking too long
        if (text && userInput.length > 0) {
          const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
          setIsFinished(true);
          socket.emit('finishGame', {
            roomCode,
            userInput,
            timeTaken: timeElapsed.toFixed(2),
          });
        }
      }, 180000); // 3 minutes timeout

      return () => clearTimeout(timeout);
    }
  }, [gameStarted, isFinished, text, userInput, roomCode, socket]);

  useEffect(() => {
    if (!text || isFinished || !gameStarted || !startTimeRef.current) return;

    const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
    // Count only correctly typed characters for WPM
    const correctChars = userInput.split('').reduce((acc, char, i) => acc + (char === text[i] ? 1 : 0), 0);
    const wordsTyped = correctChars / 5; // Standard: 5 characters = 1 word
    const wpm = timeElapsed > 0 ? Math.round((wordsTyped / timeElapsed) * 60) : 0;
    const progress = (userInput.length / text.length) * 100;

    socket.emit('userInput', { roomCode, progress, wpm });

    if (userInput.length === text.length) {
      setIsFinished(true);
      socket.emit('finishGame', {
        roomCode,
        userInput, // Authoritative validation on server
        timeTaken: timeElapsed.toFixed(2),
      });
    }
  }, [userInput, text, socket, roomCode, isFinished, gameStarted]);

  const renderText = () => {
    return text.split('').map((char, index) => {
      let className = 'text-white-50'; // Default: upcoming text
      const isCursorPosition = index === userInput.length && text && !isFinished;

      if (index < userInput.length) {
        className = char === userInput[index] ? 'text-info' : 'text-danger';
      }
      // Cursor position: keep muted color, just add cursor bar (same as PracticePage)
      if (isCursorPosition) {
        className += ' monkey-cursor';
      }

      return (
        <span key={index} className={`${className} transition-all`}>
          {char}
        </span>
      );
    });
  };

  // Check for active players
  const getActivePlayers = () => {
    if (!room?.players) return [];
    return Object.values(room.players);
  };

  if (!room) return <div className="text-center mt-5 text-info">Loading game...</div>;

  const players = getActivePlayers().sort(
    (a, b) => (b.progress || 0) - (a.progress || 0)
  );

  const getStatusMessage = () => {
    if (inactiveTimeout) return 'Game timed out - submitting your progress...';
    if (isFinished) return 'Finished! Waiting for others...';
    if (countdown !== null && countdown > 0) return 'Get ready!';
    if (gameStarted) return 'GO!';
    return 'Waiting for race to start...';
  };

  return (
    <Card className="bg-dark-secondary shadow-lg border-0">
      <Card.Body className="p-4">
        <div className="mb-4">
          {players.length > 0 ? (
            players.map((p) => (
              <PlayerProgressBar key={p.id || p.profileId} player={p} isHost={p.isHost} />
            ))
          ) : (
            <div className="text-center text-warning py-2">
              No other players connected
            </div>
          )}
        </div>

        {countdown !== null && countdown > 0 && (
          <div className="position-absolute top-50 start-50 translate-middle z-3">
            <h1 className="display-1 fw-bold text-info animate-pulse">{countdown}</h1>
          </div>
        )}

        <div
          className={`typing-area p-2 fs-1 ${!gameStarted && countdown === null ? 'opacity-50' : ''}`}
          style={{
            lineHeight: '1.4',
            position: 'relative',
            wordBreak: 'break-word',
            textAlign: 'left',
            filter: isFinished ? 'blur(4px)' : 'none',
            opacity: isFinished ? 0.3 : 1,
            minHeight: '150px'
          }}
          onClick={() => inputRef.current?.focus()}
        >
          {text ? renderText() : <div className="text-center text-white-50 py-4">Waiting for race to start...</div>}

          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => !isFinished && gameStarted && setUserInput(e.target.value)}
            onPaste={(e) => e.preventDefault()}
            className="position-absolute top-0 start-0 w-100 h-100 opacity-0"
            autoFocus
            disabled={isFinished || !gameStarted}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </div>

        <div className="text-center mt-3 text-white-50">
          {getStatusMessage()}
        </div>
      </Card.Body>
    </Card>
  );
};

export default GameRoom;
