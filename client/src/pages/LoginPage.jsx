import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const LoginPage = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            navigate('/');
        } catch (error) {
            console.error("Error during Google sign-in", error);
        }
    };

    if (currentUser) {
        navigate('/');
        return null;
    }

    return (
        <Row className="justify-content-center mt-5">
            <Col md={6} lg={5}>
                <Card className="bg-dark-secondary shadow-lg">
                    <Card.Body className="p-5 text-center">
                        <Card.Title className="fs-2 fw-bold mb-3">Welcome to TypeClash</Card.Title>
                        <Card.Text className="text-white-50 mb-4">
                            Sign in to start the battle.
                        </Card.Text>
                        <Button variant="danger" onClick={handleGoogleLogin} size="lg" className="w-100">
                            Sign in with Google
                        </Button>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
};

export default LoginPage;
