const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Public route
router.post('/register', userController.registerOrLoginUser);

// All routes below are protected
router.use(authMiddleware);

// User Profile
router.get('/me', userController.getCurrentUserProfile);
router.get('/:profileId', userController.getUserByProfileId);

// Friend System
router.get('/friends/list', userController.getFriends);
router.post('/friends/add', userController.sendFriendRequest);
router.get('/friends/requests', userController.getFriendRequests);
router.post('/friends/respond', userController.respondToFriendRequest);
router.get('/search', userController.searchUsers);


module.exports = router;