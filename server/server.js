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

// Parse allowed origins from .env
const allowedOrigins = process.env.CORS_ORIGIN.split(",");

// Middleware: CORS and JSON parser
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman or curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});
initializeSocket(io);

// API Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/matches', authMiddleware, require('./routes/matchRoutes'));
app.use('/api/leaderboard', require('./routes/leaderboardRoutes'));

// Simple test route
app.get('/', (req, res) => {
  res.send('TypeClash Server is running!');
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
