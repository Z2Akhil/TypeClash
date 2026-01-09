import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateRandomText } from '../utils/textGenerator';
import { savePracticeMatch } from '../api';
import DifficultySelector from '../components/game/DifficultySelector';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import { ArrowLeft } from 'lucide-react';
import { Timer } from 'lucide-react';

const PracticePage = () => {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('easy');
    const [timeMode, setTimeMode] = useState(30); // 30, 45, or 60
    const [text, setText] = useState('');
    const [userInput, setUserInput] = useState('');
    const [isFinished, setIsFinished] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [customTime , setCustomTime] = useState(false);
    const inputRef = useRef(null);
    const userInputRef = useRef(''); // Ref to track input for timer closure
    const startTimeRef = useRef(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    const getTimeLimit = () => {
        return timeMode;
    };

    // Timer effect
    // Timer effect
    useEffect(() => {
        let interval;
        const limit = getTimeLimit();

        if (hasStarted && !isFinished) {
            interval = setInterval(() => {
                const elapsed = (Date.now() - startTimeRef.current) / 1000;
                setElapsedTime(elapsed);

                if (elapsed >= limit) {
                    finishMatch();
                }
            }, 100);
        }
        return () => clearInterval(interval);
    }, [hasStarted, isFinished, timeMode, customTime]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') navigate('/');
            if (e.key === 'Tab') {
                e.preventDefault();
                startPractice();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate, difficulty]);

    const startPractice = () => {
        const limit = getTimeLimit();
        // Generate enough words for the time limit (approx 1 word/sec is reasonable ~60wpm)
        const wordCount = Math.ceil(limit * 1.5);
        setText(generateRandomText(difficulty, wordCount));
        setUserInput('');
        userInputRef.current = '';
        setIsFinished(false);
        setHasStarted(false);
        setElapsedTime(0);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const finishMatch = () => {
        if (isFinished) return; // Prevent double save
        setIsFinished(true);
        const finalTime = (Date.now() - startTimeRef.current) / 1000;
        const currentInput = userInputRef.current;
        const wordsTyped = currentInput.length / 5;
        const wpm = Math.round((wordsTyped / finalTime) * 60);
        const errors = currentInput.split('').reduce((acc, char, i) => acc + (char !== text[i] ? 1 : 0), 0);
        const accuracy = text.length > 0 ? Math.round(((currentInput.length - errors) / currentInput.length) * 100) : 0;

        savePracticeMatch({
            wpm, accuracy: isNaN(accuracy) ? 0 : accuracy, errorCount: errors, timeTaken: finalTime.toFixed(2), difficulty, promptText: text
        }).then(response => {
            navigate(`/results/${response.data.matchId}`, {
                state: { results: response.data.results, room: { difficulty } }
            });
        }).catch(err => {
            console.error("Failed to save practice match", err);
        });
    };

    const handleInputChange = (value) => {
        if (isFinished) return;

        if (!hasStarted) {
            setHasStarted(true);
            startTimeRef.current = Date.now();
        }
        setUserInput(value);
        userInputRef.current = value; // Keep ref in sync

        // If they type everything before time runs out (unlikely but possible)
        if (value.length === text.length) {
            finishMatch();
        }
    };

    const renderText = () =>
        text.split('').map((char, index) => {
            let className = 'text-white-50';
            const isCursorPosition = index === userInput.length && text && !isFinished;
            if (index < userInput.length) {
                className = char === userInput[index] ? 'text-info' : 'text-danger';
            }
            // Cursor position: keep muted color, just add cursor bar
            if (isCursorPosition) {
                className += ' monkey-cursor';
            }
            return (
                <span key={index} className={`${className} transition-all`}>
                    {char}
                </span>
            );
        });

    return (
        <div className="practice-container vh-100 w-100 d-flex flex-column align-items-center justify-content-center p-4 overflow-hidden">
            <div className="w-100 mb-5 d-flex justify-content-between align-items-center px-4" style={{ flexShrink: 0 }}>
                <h2 className="mb-0 text-cyan opacity-50 fw-light">practice</h2>
                <div className="d-flex align-items-center gap-4">
                    {hasStarted && !isFinished && (
                        <div className="d-flex align-items-center text-info fs-4 fw-bold">
                            <Timer size={24} className="me-2" />
                            <span>{Math.max(0, getTimeLimit() - elapsedTime).toFixed(0)}s</span>
                        </div>
                    )}
                    <div className="text-white-50 small opacity-30 d-none d-md-block">
                        <span className="p-1 px-2 border border-secondary rounded me-1">esc</span> leave
                        <span className="p-1 px-2 border border-secondary rounded ms-3 me-1">tab</span> restart
                    </div>
                </div>
            </div>

            <div className="w-100 d-flex align-items-center justify-content-center flex-grow-1 px-4">
                {!text ? (
                    <div className="p-5 bg-dark-secondary rounded-4 shadow-lg text-center w-100">
                        <DifficultySelector selected={difficulty} onSelect={setDifficulty} />

                        <div className="mt-4">
                            <h5 className="mb-3 text-muted small text-uppercase fw-bold ls-1">Time (seconds)</h5>
                            <div className="d-flex justify-content-center gap-2">
                                {[30, 45, 60].map(t => (
                                    <Button
                                        key={t}
                                        variant={timeMode === t ? 'info' : 'outline-secondary'}
                                        onClick={() => setTimeMode(t)}
                                        className={`rounded-pill px-4 fw-bold ${timeMode === t ? 'text-black' : 'text-white-50'}`}
                                        size="sm"
                                    >
                                        {t}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <Button variant="info" size="lg" className="mt-5 px-5 transition-all rounded-pill fw-bold" onClick={startPractice}>
                            Start Practice
                        </Button>
                    </div>
                ) : (
                    <div className="position-relative w-100">
                        <div
                            className="typing-area p-2 fs-1"
                            style={{
                                lineHeight: '1.4',
                                position: 'relative',
                                wordBreak: 'break-word',
                                textAlign: 'left',
                                filter: isFinished ? 'blur(4px)' : 'none',
                                opacity: isFinished ? 0.3 : 1
                            }}
                            onClick={() => inputRef.current.focus()}
                        >
                            {renderText()}
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={userInput}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onPaste={(e) => e.preventDefault()}
                            className="position-absolute top-0 start-0 w-100 h-100 opacity-0"
                            autoFocus
                            autoComplete="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            disabled={isFinished}
                        />

                        {isFinished && (
                            <div className="position-absolute top-50 start-50 translate-middle text-center w-100" style={{ zIndex: 100 }}>
                                <div className="p-5 bg-dark-secondary rounded-4 shadow-lg d-inline-block">
                                    <h3 className="text-cyan mb-4 fw-light">practice finished</h3>
                                    <Button variant="outline-info" size="lg" className="rounded-pill px-5" onClick={startPractice}>
                                        Restart
                                    </Button>
                                    <div className="mt-3 text-white-50 small">or press <span className="text-white">tab</span></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-5 text-white-50 opacity-25" style={{ flexShrink: 0 }}>
                {!hasStarted && text ? "start typing to begin" : " "}
            </div>
        </div>
    );
};

export default PracticePage;
