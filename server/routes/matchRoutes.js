const express = require('express');
const router = express.Router();
const { getMatchById } = require('../controllers/matchController');
const matchController = require('../controllers/matchController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/matches/practice
// @desc    Save a completed practice match
// @access  Private
router.post('/practice', matchController.savePracticeMatch); // <-- ADD THIS LINE

// @route   GET /api/matches/history
// @desc    Get user's match history
// @access  Private
router.get('/history', matchController.getMatchHistory);

// @route   POST /api/matches/analyze
// @desc    Get AI analysis for a specific match result
// @access  Private
router.post('/analyze', matchController.getAIAnalysis);

router.get('/:matchId', authMiddleware, getMatchById);

module.exports = router;