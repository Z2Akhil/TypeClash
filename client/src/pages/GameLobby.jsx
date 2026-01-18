import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, Crown, Copy, ArrowLeft } from 'lucide-react';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Spinner from 'react-bootstrap/Spinner';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';

const GameLobby = () => {
    const [room, setRoom] = useState(null);
    const socket = useSocket();
    const navigate = useNavigate();
    const location = useLocation();
    const { backendUser } = useAuth();
    const { roomCode } = useParams();
    // ✅ Set room from location state if available
    useEffect(() => {
        const code = roomCode || location.state?.room?.roomCode;
        if (socket && code) {
            // Ask the server for the guaranteed latest state of the room.
            socket.emit('getRoomState', { roomCode: code });
        }
    }, [socket, roomCode, location.state?.room?.roomCode]);

    useEffect(() => {
        if (!socket) return;

        const handleRoomUpdate = (roomData) => {
            setRoom(roomData);
            if (roomData.status === 'in-progress') {
                navigate(`/room/${roomData.roomCode}`, { state: { room: roomData } });
            }
        };

        const handleGameStarted = ({ text, startTime }) => {
            // Use functional update to get current room state and avoid stale closure
            setRoom(currentRoom => {
                if (currentRoom) {
                    navigate(`/room/${currentRoom.roomCode}`, {
                        state: {
                            room: {
                                ...currentRoom,
                                promptText: text,
                                startTime,
                                status: 'in-progress',
                            },
                        },
                    });
                }
                return currentRoom;
            });
        };

        const handleError = ({ message }) => {
            alert(message);
            navigate('/');
        };

        socket.on('roomUpdate', handleRoomUpdate);
        socket.on('gameStarted', handleGameStarted); // ✅ Add this
        socket.on('error', handleError);

        return () => {
            socket.off('roomUpdate', handleRoomUpdate);
            socket.off('gameStarted', handleGameStarted); // ✅ Clean up
            socket.off('error', handleError);
        };
    }, [socket, navigate, roomCode]);

    // ⏱️ Optional: Add a timeout fallback if room is never set
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!room) {
                alert("Room details not received. Please try again.");
                navigate('/');
            }
        }, 8000);

        return () => clearTimeout(timeout);
    }, [room, navigate]);

    const handleStartGame = () => {
        if (socket && room) socket.emit('startGame', { roomCode: room.roomCode });
    };

    const copyRoomCode = () => navigator.clipboard.writeText(room.roomCode);

    if (!room) {
        return (
            <div className="text-center mt-5">
                <Spinner animation="border" variant="info" />
                <span className="ms-2">Waiting for room details...</span>
            </div>
        );
    }

    const players = Object.values(room.players);
    const isHost = players.find(p => p.profileId === backendUser.profileId)?.isHost;

    return (
        <Card className="bg-dark-secondary shadow-lg">
            <Card.Header className="p-3 d-flex justify-content-between align-items-center">
                <Card.Title as="h2" className="mb-0 text-cyan">Lobby</Card.Title>
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => {
                        if (socket && room) {
                            socket.emit('leaveRoom', { roomCode: room.roomCode });
                        }
                        navigate('/');
                    }}
                >
                    <ArrowLeft size={16} className="me-2" /> Leave
                </Button>
            </Card.Header>
            <Card.Body className="p-4">
                <InputGroup className="mb-4">
                    <InputGroup.Text>Room Code</InputGroup.Text>
                    <Form.Control value={room.roomCode} readOnly className="fs-5 text-center" />
                    <Button variant="outline-light" onClick={copyRoomCode}><Copy size={18} /></Button>
                </InputGroup>
                <Row>
                    <Col md={7}>
                        <h5 className="mb-3"><Users size={20} className="me-2 text-cyan" /> Players ({players.length}/6)</h5>
                        <ListGroup>
                            {players.map(p => (
                                <ListGroup.Item key={p.profileId} className="d-flex justify-content-between align-items-center bg-dark">
                                    {p.username}
                                    {p.isHost && <Crown size={20} className="text-warning" />}
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </Col>
                    <Col md={5} className="mt-4 mt-md-0">
                        <h5 className="mb-3">Game Settings</h5>
                        <Card bg="dark">
                            <Card.Body>
                                <Card.Text>Difficulty:</Card.Text>
                                <div className="text-center fw-bold fs-5 text-capitalize mb-4">{room.difficulty}</div>
                                {isHost ? (
                                    <div className="d-grid">
                                        <Button variant="success" size="lg" onClick={handleStartGame}>Start Game</Button>
                                    </div>
                                ) : (
                                    <p className="text-center text-white-50 mt-4">Waiting for host...</p>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );
};

export default GameLobby;
