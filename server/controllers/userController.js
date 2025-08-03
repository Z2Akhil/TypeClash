const User = require('../models/User');
const admin = require('../config/firebaseAdmin');

// Called when a user signs up or logs in on the frontend
exports.registerOrLoginUser = async (req, res) => {
  const { idToken } = req.body;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      const username = name ? name.replace(/\s/g, '') + Math.floor(Math.random() * 1000) : `user${Date.now()}`;
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
    const { recipientId } = req.body; // This is the MongoDB _id of the user to befriend
    const sender = await User.findOne({ firebaseUid: req.user.uid });

    if (sender._id.equals(recipientId)) {
        return res.status(400).json({ message: "You can't add yourself as a friend." });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) return res.status(404).json({ message: "Recipient not found." });

    // Check if already friends or request already sent
    if (recipient.friendRequests.some(req => req.from.equals(sender._id)) || sender.friends.includes(recipientId)) {
        return res.status(400).json({ message: "Friend request already sent or you are already friends." });
    }

    recipient.friendRequests.push({ from: sender._id });
    await recipient.save();
    res.status(200).json({ message: "Friend request sent." });
};

exports.getFriendRequests = async (req, res) => {
    const user = await User.findOne({ firebaseUid: req.user.uid }).populate('friendRequests.from', 'username profileId');
    res.json(user.friendRequests.filter(r => r.status === 'pending'));
};

exports.respondToFriendRequest = async (req, res) => {
    const { requestId, response } = req.body; // response is 'accept' or 'decline'
    const user = await User.findOne({ firebaseUid: req.user.uid });

    const request = user.friendRequests.find(r => r._id.equals(requestId));
    if (!request) return res.status(404).json({ message: "Request not found." });

    if (response === 'accept') {
        // Add to each other's friend lists
        user.friends.push(request.from);
        const sender = await User.findById(request.from);
        sender.friends.push(user._id);
        
        // Remove the request
        user.friendRequests = user.friendRequests.filter(r => !r._id.equals(requestId));
        
        await user.save();
        await sender.save();
        res.status(200).json({ message: "Friend added." });
    } else { // Decline
        user.friendRequests = user.friendRequests.filter(r => !r._id.equals(requestId));
        await user.save();
        res.status(200).json({ message: "Friend request declined." });
    }
};

exports.getFriends = async (req, res) => {
    const user = await User.findOne({ firebaseUid: req.user.uid }).populate('friends', 'username profileId');
    res.json(user.friends);
};
