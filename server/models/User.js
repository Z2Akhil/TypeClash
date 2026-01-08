const mongoose = require('mongoose');
const { customAlphabet } = require('nanoid');

// Generate a unique, 8-character alphanumeric ID
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 8);

const UserSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true },
  profileId: { type: String, required: true, unique: true, default: () => nanoid() },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' }
  }],
  stats: {
    highestWpm: { type: Number, default: 0 },
    averageWpm: { type: Number, default: 0 },
    averageAccuracy: { type: Number, default: 0 },
    totalRaces: { type: Number, default: 0 },
  },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);