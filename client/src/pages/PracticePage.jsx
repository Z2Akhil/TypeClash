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
    const [text, setText] = useState('');
    const [userInput, setUserInput] = useState('');
    const [isFinished, setIsFinished] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const inputRef = useRef(null);
    const startTimeRef = useRef(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Timer effect
    useEffect(() => {
        let interval;
        if (hasStarted && !isFinished) {
            interval = setInterval(() => {
                setElapsedTime((Date.now() - startTimeRef.current) / 1000);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [hasStarted, isFinished]);

    const startPractice = () => {
        setText(generateRandomText(difficulty));
        setUserInput('');
        setIsFinished(false);
        setHasStarted(false);
        setElapsedTime(0);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleInputChange = (value) => {
        if (isFinished) return;

        if (!hasStarted) {
            setHasStarted(true);
            startTimeRef.current = Date.now();
        }
        setUserInput(value);

        if (value.length === text.length) {
            setIsFinished(true);
            const finalTime = (Date.now() - startTimeRef.current) / 1000;
            const wordsTyped = text.length / 5;
            const wpm = Math.round((wordsTyped / finalTime) * 60);
            const errors = value.split('').reduce((acc, char, i) => acc + (char !== text[i] ? 1 : 0), 0);
            const accuracy = Math.round(((text.length - errors) / text.length) * 100);

            savePracticeMatch({
                wpm, accuracy, errorCount: errors, timeTaken: finalTime.toFixed(2), difficulty, promptText: text
            }).then(response => {
                navigate(`/results/${response.data.matchId}`, {
                    state: { results: response.data.results, room: { difficulty } }
                });
            }).catch(err => {
                console.error("Failed to save practice match", err);
            });
        }
    };

    const renderText = () =>
        text.split('').map((char, index) => {
            let className = 'text-white-50';
            if (index < userInput.length) {
                className = char === userInput[index] ? 'text-info' : 'text-danger bg-danger-subtle';
            }
            return (
                <span key={index} className={className}>
                    {char}
                    {/* Render caret if it's the current position */}
                    {index === userInput.length - 1 && !isFinished && <span className="blinking-caret" />}
                </span>
            );
        });

    return (
        <Card className="bg-dark-secondary shadow-lg">
            <Card.Header className="p-3 d-flex justify-content-between align-items-center">
                <Card.Title as="h2" className="mb-0 text-cyan">Practice Mode</Card.Title>
                <Button variant="outline-secondary" size="sm" onClick={() => navigate('/')}>
                    <ArrowLeft size={16} className="me-2" /> Leave
                </Button>
            </Card.Header>
            <Card.Body className="p-4">
                {!text ? (
                    <div className="text-center">
                        <DifficultySelector selected={difficulty} onSelect={setDifficulty} />
                        <Button variant="info" size="lg" className="mt-4" onClick={startPractice}>Start</Button>
                    </div>
                ) : (
                    <>
                        <div className="d-flex justify-content-end align-items-center mb-3 text-white-50">
                            <Timer size={18} className="me-2" />
                            <span>{elapsedTime.toFixed(0)}s</span>
                        </div>
                        <div
                            className="p-4 bg-dark rounded fs-4"
                            style={{ lineHeight: '1.7', position: 'relative' }}
                            onClick={() => inputRef.current.focus()}
                        >
                            {renderText()}
                            <input
                                ref={inputRef}
                                type="text"
                                value={userInput}
                                onChange={(e) => handleInputChange(e.target.value)}
                                className="position-absolute top-0 start-0 w-100 h-100 opacity-0"
                                autoFocus
                                disabled={isFinished}
                            />
                        </div>
                        <div className="text-center mt-4">
                            <Button variant="outline-secondary" onClick={startPractice}>Restart Practice</Button>
                        </div>
                    </>
                )}
            </Card.Body>
        </Card>
    );
};

export default PracticePage;
