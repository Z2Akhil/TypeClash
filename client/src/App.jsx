import { Routes, Route } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import AppNavbar from './components/layout/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import GameLobby from './pages/GameLobby';
import GameRoom from './pages/GameRoom';
import ResultsPage from './pages/ResultsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import PracticePage from './pages/PracticePage'; // <-- NEW
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <div data-bs-theme="dark">
      <AppNavbar />
      <Container as="main" className="py-4">
      <main>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/practice" element={<ProtectedRoute><PracticePage /></ProtectedRoute>} /> {/* <-- NEW */}
          <Route path="/lobby" element={<ProtectedRoute><GameLobby /></ProtectedRoute>} />
          <Route path="/lobby/:roomCode" element={<ProtectedRoute><GameLobby /></ProtectedRoute>} />
          <Route path="/room/:roomCode" element={<ProtectedRoute><GameRoom /></ProtectedRoute>} />
          <Route path="/results/:matchId" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
          <Route path="/profile/:profileId" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        </Routes>
      </main>
    </Container>
    </div>
  )
}

export default App;
