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

  const [room, setRoom] = useState(location.state?.room || null);
  const [text, setText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
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
      setCountdown(3); // Start 3-second countdown
    };

    const handleGameFinished = (data) => {
      navigate(`/results/${data.matchId}`, {
        state: { results: data.results, room: room },
      });
    };

    socket.on('playerProgress', handlePlayerProgress);
    socket.on('gameStarted', handleGameStarted);
    socket.on('gameFinished', handleGameFinished);

    return () => {
      socket.off('playerProgress', handlePlayerProgress);
      socket.off('gameStarted', handleGameStarted);
      socket.off('gameFinished', handleGameFinished);
    };
  }, [socket, navigate, room]);

  // Countdown logic
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

  useEffect(() => {
    if (!text || isFinished || !gameStarted || !startTimeRef.current) return;

    const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
    const wordsTyped = userInput.length / 5;
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
      let decoration = {};

      if (index < userInput.length) {
        if (char === userInput[index]) {
          className = 'text-info'; // Correctly typed
        } else {
          className = 'text-danger'; // Error
        }
      } else if (index === userInput.length && !isFinished) {
        className = 'monkey-cursor active-char fw-bold'; // Cursor position
      }

      return (
        <span key={index} className={`${className} transition-all`} style={decoration}>
          {char}
        </span>
      );
    });
  };

  if (!room) return <div className="text-center mt-5 text-info">Loading game...</div>;

  const players = Object.values(room.players).sort(
    (a, b) => (b.progress || 0) - (a.progress || 0)
  );

  return (
    <Card className="bg-dark-secondary shadow-lg border-0">
      <Card.Body className="p-4">
        <div className="mb-4">
          {players.map((p) => (
            <PlayerProgressBar key={p.id} player={p} isHost={p.isHost} />
          ))}
        </div>

        {countdown !== null && countdown > 0 && (
          <div className="position-absolute top-50 start-50 translate-middle z-3">
            <h1 className="display-1 fw-bold text-info animate-pulse">{countdown}</h1>
          </div>
        )}

        <div
          className={`p-4 bg-dark rounded fs-4 transition-all duration-300 ${!gameStarted && countdown === null ? 'opacity-50' : ''}`}
          style={{ lineHeight: '1.7', position: 'relative', cursor: 'text', minHeight: '150px' }}
          onClick={() => inputRef.current?.focus()}
        >
          {text ? renderText() : <div className="text-center text-white-50 py-4">Waiting for race to start...</div>}

          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => !isFinished && gameStarted && setUserInput(e.target.value)}
            onPaste={(e) => e.preventDefault()}
            className="position-absolute top-0 start-0 w-100 h-100 opacity-0 cursor-default"
            autoFocus
            disabled={isFinished || !gameStarted}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </div>

        <div className="text-center mt-3 text-white-50">
          {isFinished
            ? 'Finished! Waiting for others...'
            : countdown !== null && countdown > 0
              ? 'Get ready!'
              : gameStarted
                ? 'GO!'
                : 'Waiting for host to start the race...'}
        </div>
      </Card.Body>
    </Card>
  );
};

export default GameRoom;
