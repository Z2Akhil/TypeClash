const mongoose = require('mongoose');

const PlayerResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true }, // Denormalized for convenience
  wpm: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  errorCount: { type: Number, required: true }, // CHANGED from 'errors'
  timeTaken: { type: Number, required: true }, // in seconds
});

const MatchSchema = new mongoose.Schema({
  gameMode: { type: String, enum: ['practice', '1v1', 'multiplayer'], required: true },
  roomCode: { type: String, index: true }, // For multiplayer games
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  promptText: { type: String, required: true },
  players: [PlayerResultSchema],
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Match', MatchSchema);