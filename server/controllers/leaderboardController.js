const User = require('../models/User');

exports.getLeaderboard = async (req, res) => {
    try {
        // For now, we'll sort by highestWpm. This can be made more complex later.
        const leaderboard = await User.find({})
            .sort({ 'stats.highestWpm': -1 })
            .limit(20)
            .select('username profileId stats.highestWpm');
        
        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};