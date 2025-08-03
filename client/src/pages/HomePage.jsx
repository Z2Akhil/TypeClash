import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import DifficultySelector from '../components/game/DifficultySelector';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const HomePage = () => {
    const [joinCode, setJoinCode] = useState('');
    const [difficulty, setDifficulty] = useState('easy');
    const socket = useSocket();
    const navigate = useNavigate();

    // ✅ Handle roomUpdate and navigate after receiving room info
    useEffect(() => {
        if (!socket) return;

        const handleRoomUpdate = (roomData) => {
            navigate('/lobby', { state: { room: roomData } });
        };

        socket.on('roomUpdate', handleRoomUpdate);
        return () => socket.off('roomUpdate', handleRoomUpdate);
    }, [socket, navigate]);

    const handleCreateRoom = () => {
        if (socket) {
            socket.emit('createRoom', { difficulty });
        }
    };

    const handleJoinRoom = (e) => {
        e.preventDefault();
        if (socket && joinCode.trim()) {
            socket.emit('joinRoom', { roomCode: joinCode.toUpperCase() });
        }
    };

    return (
        <div className="text-center mt-4">
            <h1 className="display-4 fw-bold text-cyan mb-3">Ready to Clash?</h1>
            <p className="text-white-50 fs-5 mb-5">Challenge your friends or practice your skills solo.</p>
            <Row className="justify-content-center">
                <Col md={8} lg={6}>
                    <Card className="bg-dark-secondary shadow-lg">
                        <Card.Body className="p-5">
                            <div className="d-grid gap-3">
                                <Link to="/practice" className="btn btn-lg btn-outline-info">Practice Solo</Link>
                                <hr className="my-1" />
                                <DifficultySelector selected={difficulty} onSelect={setDifficulty} />
                                <Button variant="info" size="lg" onClick={handleCreateRoom}>
                                    Create Multiplayer Room
                                </Button>
                            </div>
                            <div className="text-center text-white-50 my-3">OR</div>
                            <Form onSubmit={handleJoinRoom}>
                                <InputGroup>
                                    <Form.Control
                                        type="text"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value)}
                                        placeholder="JOIN WITH CODE"
                                        maxLength="6"
                                        className="text-center text-uppercase fs-5"
                                    />
                                    <Button variant="outline-light" type="submit">Join</Button>
                                </InputGroup>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default HomePage;
