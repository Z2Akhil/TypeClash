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
  const inputRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handlePlayerProgress = (data) => {
      setRoom((prevRoom) => {
        const newPlayers = { ...prevRoom.players };
        if (newPlayers[data.id]) {
          newPlayers[data.id] = { ...newPlayers[data.id], ...data };
        }
        return { ...prevRoom, players: newPlayers };
      });
    };

    const handleGameStarted = (data) => {
      setText(data.text);
      startTimeRef.current = data.startTime;
      inputRef.current?.focus();
    };

    const handleGameFinished = (data) => {
      navigate(`/results/${data.matchId}`, {
        state: { results: data.results, room: room },
      });
    };

    socket.on('playerProgress', handlePlayerProgress);
    socket.on('gameStarted', handleGameStarted);
    socket.on('gameFinished', handleGameFinished);

    if (room?.promptText) {
      setText(room.promptText);
      startTimeRef.current = room.startTime;
    }

    return () => {
      socket.off('playerProgress', handlePlayerProgress);
      socket.off('gameStarted', handleGameStarted);
      socket.off('gameFinished', handleGameFinished);
    };
  }, [socket, navigate, room]);

  useEffect(() => {
    if (!text || isFinished || !startTimeRef.current) return;

    const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
    const wordsTyped = userInput.length / 5;
    const wpm = timeElapsed > 0 ? Math.round((wordsTyped / timeElapsed) * 60) : 0;
    const progress = (userInput.length / text.length) * 100;

    socket.emit('userInput', { roomCode, progress, wpm });

    if (userInput.length === text.length) {
      setIsFinished(true);

      let errors = userInput.split('').reduce((acc, char, i) => {
        return acc + (char !== text[i] ? 1 : 0);
      }, 0);

      const accuracy = Math.round(((text.length - errors) / text.length) * 100);

      socket.emit('finishGame', {
        roomCode,
        // 'wpm' is no longer sent; the server will use its last known value
        accuracy,
        errorCount: errors,
        timeTaken: timeElapsed.toFixed(2),
    });
    }
  }, [userInput, text, socket, roomCode, isFinished]);

  const renderText = () => {
    return text.split('').map((char, index) => {
      let className = 'text-white-50';
      if (index < userInput.length) {
        className =
          char === userInput[index]
            ? 'text-info'
            : 'text-danger bg-danger-subtle';
      }
      return (
        <span key={index} className={className}>
          {char}
        </span>
      );
    });
  };

  if (!room) return <div>Loading game...</div>;

  const players = Object.values(room.players).sort(
    (a, b) => (b.progress || 0) - (a.progress || 0)
  );

  return (
    <Card className="bg-dark-secondary shadow-lg">
      <Card.Body className="p-4">
        <div className="mb-4">
          {players.map((p) => (
            <PlayerProgressBar key={p.id} player={p} isHost={p.isHost} />
          ))}
        </div>
        <div
          className="p-4 bg-dark rounded fs-4"
          style={{ lineHeight: '1.7' }}
          onClick={() => inputRef.current.focus()}
        >
          {renderText()}
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => !isFinished && setUserInput(e.target.value)}
            className="position-absolute top-0 start-0 w-100 h-100 opacity-0"
            autoFocus
            disabled={isFinished}
          />
        </div>
        <div className="text-center mt-3 text-white-50">
          {isFinished
            ? 'Finished! Waiting for others...'
            : 'The race is on! Start typing...'}
        </div>
      </Card.Body>
    </Card>
  );
};

export default GameRoom;
