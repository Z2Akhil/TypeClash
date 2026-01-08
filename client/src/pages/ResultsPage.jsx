import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Crown, BarChart2, BrainCircuit, RefreshCw, ThumbsUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

import { getAIAnalysis } from '../api/index.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSocket } from '../contexts/SocketContext.jsx';

import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Spinner from 'react-bootstrap/Spinner';

const ResultsPage = () => {
    // --- HOOKS ---
    const { matchId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { backendUser, token } = useAuth();
    const socket = useSocket();

    // --- STATE MANAGEMENT ---
    const [results, setResults] = useState(location.state?.results || []);
    const [roomCode, setRoomCode] = useState(location.state?.room?.roomCode || null);
    const [difficulty, setDifficulty] = useState(location.state?.room?.difficulty || 'unknown');
    const [aiSuggestion, setAiSuggestion] = useState('');
    const [isLoadingPage, setIsLoadingPage] = useState(true);
    const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
    
    // --- EFFECTS ---

    useEffect(() => {
        if (socket && roomCode) {
            const handleRematch = (data) => navigate(`/lobby/${data.roomCode}`);
            socket.on('rematch-ready', handleRematch);
            return () => socket.off('rematch-ready', handleRematch);
        }
    }, [socket, navigate, roomCode]);

    useEffect(() => {
        if (matchId && results.length === 0) {
            const fetchMatchData = async () => {
                try {
                    const response = await axios.get(`/api/matches/${matchId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const match = response.data;
                    setResults(match.players);
                    setRoomCode(match.roomCode); 
                    setDifficulty(match.difficulty);
                } catch (error) {
                    console.error("Failed to fetch match data:", error);
                    navigate('/');
                } finally {
                    setIsLoadingPage(false);
                }
            };
            fetchMatchData();
        } else {
            setIsLoadingPage(false);
        }
    }, [matchId, results.length, navigate, token]);

    // --- HANDLER FUNCTIONS ---

    const handlePlayAgain = () => {
        if (roomCode && socket) {
            socket.emit('play-again', { roomCode });
        } else {
            navigate('/practice');
        }
    };

    const handleNewMatch = () => {
        if (roomCode && socket) {
            socket.emit('leaveRoom', { roomCode });
        }
        navigate('/');
    };

    const handleGetAIAnalysis = async () => {
        if (!myStats) return;
        setIsLoadingSuggestion(true);
        try {
            const response = await getAIAnalysis({
                wpm: myStats.wpm, accuracy: myStats.accuracy, errorCount: myStats.errorCount,
                timeTaken: myStats.timeTaken, difficulty: difficulty,
            });
            setAiSuggestion(response.data.analysis);
        } catch (error) {
            setAiSuggestion("Could not generate a suggestion at this time.");
        } finally {
            setIsLoadingSuggestion(false);
        }
    };

    // --- HELPER FUNCTIONS & DERIVED STATE ---

    // FIX: The getPraiseMessage function is restored here.
    const getPraiseMessage = (wpm) => {
        if (wpm >= 100) return "🔥 Incredible speed! You're typing like a pro.";
        if (wpm >= 80) return "💪 Great job! You’re well above average.";
        if (wpm >= 60) return "👍 Good speed! With some practice, you'll be elite.";
        if (wpm >= 40) return "🙂 Not bad! Let’s work on pushing past 60 WPM.";
        return "🚀 You're getting started — keep practicing and improving!";
    };

    const renderFormattedSuggestion = (text) => {
        if (!text) return null;
        const parts = text.split('**');
        return (
            <p style={{ whiteSpace: 'pre-wrap' }}>
                {parts.map((part, index) => {
                    if (index % 2 === 1) return <strong key={index}>{part}</strong>;
                    return <span key={index}>{part}</span>;
                })}
            </p>
        );
    };

    const myStats = React.useMemo(() => {
        if (!backendUser || results.length === 0) return null;
        return results.find(r => String(r.user) === String(backendUser.id));
    }, [backendUser, results]);

    const chartData = results.map(p => ({ name: p.username, WPM: p.wpm, Accuracy: p.accuracy }));

    // --- RENDER LOGIC ---

    if (isLoadingPage) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
                <Spinner animation="border" variant="info" />
                <span className="ms-3 fs-4 text-white-50">Loading Results...</span>
            </div>
        );
    }

    return (
        <Card className="bg-dark-secondary shadow-lg">
            <Card.Header className="p-3 text-center">
                <Card.Title as="h2" className="mb-0 text-cyan">Race Results</Card.Title>
            </Card.Header>
            <Card.Body className="p-4">
                <h5 className="mb-3">Final Standings</h5>
                <ListGroup className="mb-5">
                    {results.map((p, index) => (
                        <ListGroup.Item key={p.user || index} variant={p.user === backendUser?.id ? 'info' : 'dark'} className="d-flex align-items-center">
                            <span className="fw-bold me-3 fs-5">{index + 1}.</span>
                            <div className="flex-grow-1 fw-semibold">
                                {p.username} {index === 0 && <Crown size={20} className="ms-2 text-warning" />}
                            </div>
                            <div className="d-flex text-end" style={{ width: '240px' }}>
                                <div className="w-50">{p.wpm} WPM</div>
                                <div className="w-50">{p.accuracy}% Acc</div>
                            </div>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
                <Row>
                    <Col lg={6} className="mb-4 mb-lg-0">
                        <Card bg="dark">
                           <Card.Body>
                                <Card.Title as="h5"><BarChart2 size={20} className="me-2 text-cyan" /> Performance Chart</Card.Title>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
                                        <Legend />
                                        <Bar dataKey="WPM" fill="#0dcaf0" />
                                        <Bar dataKey="Accuracy" fill="#6c757d" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={6}>
                        <Card bg="dark" className="h-100">
                            <Card.Body>
                                <Card.Title as="h5"><ThumbsUp size={20} className="me-2 text-cyan" /> Feedback & Suggestions</Card.Title>
                                {myStats && (
                                    <div className="mb-3">{getPraiseMessage(myStats.wpm)}</div>
                                )}
                                {aiSuggestion ? (
                                    <div className="p-2">{renderFormattedSuggestion(aiSuggestion)}</div>
                                ) : (
                                    <div className="text-center mt-4">
                                        <Button variant="outline-info" onClick={handleGetAIAnalysis} disabled={isLoadingSuggestion || !myStats}>
                                            {isLoadingSuggestion ? <><Spinner as="span" animation="border" size="sm" /> Loading...</> : 'Get Personalized Tips'}
                                        </Button>
                                        {!myStats && !isLoadingPage && <p className="text-white-50 mt-2 small">Your stats could not be loaded.</p>}
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <div className="text-center mt-5 d-flex justify-content-center gap-3 flex-wrap">
                    <Button variant="info" size="lg" onClick={handlePlayAgain} disabled={isLoadingPage && !!matchId}>
                        <RefreshCw size={20} className="me-2" />
                        {isLoadingPage && !!matchId ? 'Loading...' : 'Play Again'}
                    </Button>
                    <Button variant="secondary" size="lg" onClick={handleNewMatch}>
                        <BrainCircuit size={20} className="me-2" /> New Match
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
};

export default ResultsPage;
