import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { LogOut, User, Trophy } from 'lucide-react';

import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';

const AppNavbar = () => {
    const { currentUser, backendUser } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    // This function will handle the navigation for the login link
    const handleLoginClick = () => {
        navigate('/login');
    };

    return (
        <Navbar bg="dark-secondary" expand="lg" className="shadow-sm">
            <Container>
                <Navbar.Brand as={Link} to="/" className="fw-bold text-cyan fs-4">
                    TypeClash
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link as={Link} to="/leaderboard"><Trophy size={18} className="me-1"/> Leaderboard</Nav.Link>
                    </Nav>
                    <Nav className="ms-auto align-items-center">
                        {currentUser && backendUser ? (
                            <NavDropdown title={<><User className="me-1" size={18} />{backendUser.username}</>} id="basic-nav-dropdown">
                                <NavDropdown.Item as={Link} to={`/profile/${backendUser.profileId}`}>My Profile</NavDropdown.Item>
                                <NavDropdown.Divider />
                                <NavDropdown.Item onClick={handleLogout} className="text-danger">
                                    <LogOut className="me-2" size={16} /> Logout
                                </NavDropdown.Item>
                            </NavDropdown>
                        ) : (
                            // -- FIX APPLIED HERE --
                            // Instead of using `as={Link}`, we use a direct onClick handler.
                            <Nav.Link onClick={handleLoginClick} className="fw-bold" style={{ cursor: 'pointer' }}>
                                Login
                            </Nav.Link>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default AppNavbar;
