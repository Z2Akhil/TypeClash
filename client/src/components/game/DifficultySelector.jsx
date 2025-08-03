import React from 'react';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';

const DifficultySelector = ({ selected, onSelect }) => {
    const difficulties = ['easy', 'medium', 'hard'];

    return (
        <div className="text-center">
            <h5 className="mb-3">Select Difficulty</h5>
            <ButtonGroup>
                {difficulties.map((level) => (
                    <Button
                        key={level}
                        variant={selected === level ? 'info' : 'secondary'}
                        onClick={() => onSelect(level)}
                        className="text-capitalize fw-semibold"
                    >
                        {level}
                    </Button>
                ))}
            </ButtonGroup>
        </div>
    );
};

export default DifficultySelector;