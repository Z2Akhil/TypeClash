import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getUserProfile, getMatchHistory } from '../api';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Spinner from 'react-bootstrap/Spinner';
import ListGroup from 'react-bootstrap/ListGroup';
import { BarChart, User, Hash } from 'lucide-react';

const ProfilePage = () => {
    const { profileId } = useParams();
    const [profile, setProfile] = useState(null);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfileData = async () => {
            setLoading(true);
            try {
                const profileRes = await getUserProfile(profileId);
                setProfile(profileRes.data);
                // For now, we can only fetch our own match history due to backend limitations
                // In a real app, you'd have an endpoint for `/api/matches/history/:userId`
                const matchesRes = await getMatchHistory();
                setMatches(matchesRes.data);
            } catch (error) {
                console.error("Failed to load profile data", error);
            } finally {
                setLoading(false);
            }
        };
        loadProfileData();
    }, [profileId]);

    if (loading) {
        return <div className="text-center"><Spinner animation="border" variant="info" /></div>;
    }

    if (!profile) {
        return <div className="text-center">User not found.</div>;
    }

    return (
        <Row>
            <Col md={4}>
                <Card className="bg-dark-secondary shadow mb-4">
                    <Card.Body className="text-center">
                        <User size={80} className="mb-3 text-cyan" />
                        <Card.Title as="h2">{profile.username}</Card.Title>
                        <Card.Text className="text-white-50"><Hash size={14}/> {profile.profileId}</Card.Text>
                    </Card.Body>
                    <ListGroup variant="flush">
                        <ListGroup.Item className="d-flex justify-content-between bg-dark">
                            <strong>Highest WPM</strong><span>{profile.stats.highestWpm}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between bg-dark">
                            <strong>Average WPM</strong><span>{profile.stats.averageWpm}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between bg-dark">
                            <strong>Races Completed</strong><span>{profile.stats.totalRaces}</span>
                        </ListGroup.Item>
                    </ListGroup>
                </Card>
            </Col>
            <Col md={8}>
                 <Card className="bg-dark-secondary shadow">
                    <Card.Header><BarChart size={20} className="me-2"/>Match History</Card.Header>
                    <ListGroup variant="flush">
                        {matches.length > 0 ? matches.map(match => (
                            <ListGroup.Item key={match._id} className="bg-dark">
                                <Row>
                                    <Col>{new Date(match.createdAt).toLocaleDateString()}</Col>
                                    <Col className="text-capitalize">{match.difficulty}</Col>
                                    <Col>Winner: {match.players.find(p => p.user === match.winner)?.username || 'N/A'}</Col>
                                </Row>
                            </ListGroup.Item>
                        )) : (
                            <ListGroup.Item className="bg-dark text-center text-white-50">No matches played yet.</ListGroup.Item>
                        )}
                    </ListGroup>
                 </Card>
            </Col>
        </Row>
    );
};

export default ProfilePage;
