import React, { useState, useEffect } from 'react';
import { getLeaderboard } from '../api';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Spinner from 'react-bootstrap/Spinner';
import { Trophy } from 'lucide-react';

const LeaderboardPage = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const { data } = await getLeaderboard();
                setLeaderboard(data);
            } catch (error) {
                console.error("Failed to fetch leaderboard", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const getRankColor = (index) => {
        if (index === 0) return 'warning'; // Gold
        if (index === 1) return 'secondary'; // Silver
        if (index === 2) return 'danger'; // Bronze (using danger for a distinct color)
        return 'dark';
    }

    return (
        <Card className="bg-dark-secondary shadow-lg">
            <Card.Header className="p-3 text-center">
                <Card.Title as="h2" className="mb-0 text-cyan"><Trophy className="me-2"/>Global Leaderboard</Card.Title>
            </Card.Header>
            <Card.Body>
                {loading ? (
                    <div className="text-center"><Spinner animation="border" variant="info" /></div>
                ) : (
                    <ListGroup>
                        {leaderboard.map((user, index) => (
                            <ListGroup.Item key={user.profileId} variant={getRankColor(index)} className="d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center">
                                    <span className="fw-bold fs-5 me-3" style={{width: '30px'}}>#{index + 1}</span>
                                    <span>{user.username}</span>
                                </div>
                                <span className="fw-bold text-info">{user.stats.highestWpm} WPM</span>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                )}
            </Card.Body>
        </Card>
    );
};

export default LeaderboardPage;
