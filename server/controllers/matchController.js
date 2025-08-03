const Match = require('../models/Match');
const User = require('../models/User');
const aiAnalysisService = require('../services/aiAnalysisService');

exports.savePracticeMatch = async (req, res) => {
    const { wpm, accuracy, errorCount, timeTaken, difficulty, promptText } = req.body;
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const playerResult = {
            user: user._id,
            username: user.username,
            wpm,
            accuracy,
            errorCount,
            timeTaken
        };

        const match = new Match({
            gameMode: 'practice',
            difficulty,
            promptText,
            players: [playerResult],
            winner: user._id
        });

        await match.save();

        // Update user stats
        user.stats.totalRaces += 1;
        if (wpm > user.stats.highestWpm) {
            user.stats.highestWpm = wpm;
        }
        // A more complex average calculation could be done here
        user.stats.averageWpm = ((user.stats.averageWpm * (user.stats.totalRaces - 1)) + wpm) / user.stats.totalRaces;
        await user.save();

        res.status(201).json({ message: 'Practice match saved', matchId: match._id, results: [playerResult] });

    } catch (error) {
        console.error("Error saving practice match:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};


exports.getMatchHistory = async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const matches = await Match.find({ 'players.user': user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(matches);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAIAnalysis = async (req, res) => {
  const { wpm, accuracy, errorCount, difficulty, timeTaken } = req.body;
  if (!wpm || !accuracy || !difficulty) {
    return res.status(400).json({ message: 'Missing required stats for analysis.' });
  }

  try {
    const analysis = await aiAnalysisService.getTypingAnalysis({
      wpm,
      accuracy,
      errors: errorCount,
      difficulty,
      timeTaken
    });
    res.json({ analysis });
  } catch (error) {
    console.error("AI Analysis Controller Error:", error);
    res.status(500).json({ message: 'Failed to get AI analysis.' });
  }
};

// Add this new function
exports.getMatchById = async (req, res) => {
    try {
        const match = await Match.findById(req.params.matchId);
        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }
        res.json(match);
    } catch (error) {
        console.error('Error fetching match:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// You might also have other functions here like saveMatch, etc.