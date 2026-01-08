import React from 'react';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { Crown } from 'lucide-react';

const PlayerProgressBar = ({ player, isHost }) => {
    return (
        <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center small mb-1">
                <span className="fw-semibold d-flex align-items-center">
                    {player.username}
                    {isHost && <Crown size={16} className="ms-2 text-warning" />}
                </span>
                <span className="text-cyan">{player.wpm || 0} WPM</span>
            </div>
            <ProgressBar 
                now={player.progress || 0} 
                variant="info" 
                style={{ height: '10px' }}
            />
        </div>
    );
};

export default PlayerProgressBar;
