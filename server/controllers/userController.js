const User = require('../models/User');
const admin = require('../config/firebaseAdmin');
const mongoose = require('mongoose');

// Called when a user signs up or logs in on the frontend
exports.registerOrLoginUser = async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ message: "ID Token is required" });

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      // Improved username generation: more unique and predictable
      const baseName = name ? name.replace(/\s/g, '').toLowerCase() : 'user';
      let username = `${baseName}${Math.floor(1000 + Math.random() * 9000)}`;

      // Basic collision check (one-time retry for simplicity, real app would use a loop)
      const existing = await User.findOne({ username });
      if (existing) {
        username = `${baseName}${Date.now().toString().slice(-4)}`;
      }

      user = new User({
        firebaseUid: uid,
        email: email,
        username: username,
      });
      await user.save();
    }

    res.status(200).json({
      message: "User authenticated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileId: user.profileId
      }
    });
  } catch (error) {
    console.error("User registration/login error:", error);
    res.status(500).json({ message: "Error authenticating user." });
  }
};

exports.getCurrentUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid }).populate('friends', 'username profileId');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserByProfileId = async (req, res) => {
  try {
    const user = await User.findOne({ profileId: req.params.profileId }).select('username profileId stats');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.searchUsers = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ message: 'Search query is required' });
  try {
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { profileId: { $regex: q, $options: 'i' } }
      ],
      firebaseUid: { $ne: req.user.uid } // Exclude self
    }).limit(10).select('username profileId');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// --- Friend System Logic ---

exports.sendFriendRequest = async (req, res) => {
  const { recipientId } = req.body;

  // Validation: Check if recipientId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(recipientId)) {
    return res.status(400).json({ message: "Invalid recipient ID." });
  }

  try {
    const sender = await User.findOne({ firebaseUid: req.user.uid });
    if (!sender) return res.status(404).json({ message: "Sender not found." });

    if (sender._id.equals(recipientId)) {
      return res.status(400).json({ message: "You can't add yourself as a friend." });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) return res.status(404).json({ message: "Recipient not found." });

    // Check if already friends or request already sent
    const alreadyRequested = recipient.friendRequests.some(r => r.from.equals(sender._id));
    const alreadyFriends = sender.friends.includes(recipientId);

    if (alreadyRequested || alreadyFriends) {
      return res.status(400).json({ message: "Friend request already sent or you are already friends." });
    }

    recipient.friendRequests.push({ from: sender._id });
    await recipient.save();
    res.status(200).json({ message: "Friend request sent." });
  } catch (error) {
    console.error("Send friend request error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

exports.getFriendRequests = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid }).populate('friendRequests.from', 'username profileId');
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user.friendRequests.filter(r => r.status === 'pending'));
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

exports.respondToFriendRequest = async (req, res) => {
  const { requestId, response } = req.body; // response is 'accept' or 'decline'

  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return res.status(400).json({ message: "Invalid request ID." });
  }

  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ message: "User not found." });

    const request = user.friendRequests.find(r => r._id.equals(requestId));
    if (!request) return res.status(404).json({ message: "Request not found." });

    if (response === 'accept') {
      const sender = await User.findById(request.from);
      if (!sender) return res.status(404).json({ message: "Sender no longer exists." });

      // Avoid duplicates
      if (!user.friends.includes(request.from)) {
        user.friends.push(request.from);
      }
      if (!sender.friends.includes(user._id)) {
        sender.friends.push(user._id);
      }

      user.friendRequests = user.friendRequests.filter(r => !r._id.equals(requestId));
      await user.save();
      await sender.save();
      res.status(200).json({ message: "Friend added." });
    } else { // Decline
      user.friendRequests = user.friendRequests.filter(r => !r._id.equals(requestId));
      await user.save();
      res.status(200).json({ message: "Friend request declined." });
    }
  } catch (error) {
    console.error("Respond to friend request error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

exports.getFriends = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid }).populate('friends', 'username profileId');
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};
