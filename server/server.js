require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const initializeSocket = require('./socket/socketHandler');
const authMiddleware = require('./middleware/authMiddleware');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

// Main Server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ["GET", "POST"]
  }
});
initializeSocket(io);

// API Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/matches', authMiddleware, require('./routes/matchRoutes'));
app.use('/api/leaderboard', require('./routes/leaderboardRoutes')); // <-- ADD THIS LINE

// Simple test route
app.get('/', (req, res) => {
  res.send('TypeClash Server is running!');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));