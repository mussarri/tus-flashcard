import React from 'react';
import { View, Text } from 'react-native';
import BaseFlashcard from './BaseFlashcard';
import { Flashcard } from '../../types';
import { cardStyles } from './CardStyles';

interface FunctionalAnatomyCardProps {
    flashcard: Flashcard;
    isFlipped: boolean;
    onFlip: () => void;
}

/**
 * FUNCTIONAL_ANATOMY Card Component
 * Function, innervation, vascular supply: "What is the function of [structure]?"
 */
export default function FunctionalAnatomyCard({
    flashcard,
    isFlipped,
    onFlip,
}: FunctionalAnatomyCardProps) {
    // Parse structured answer (function, innervation, blood supply)
    const parseStructuredAnswer = (text: string) => {
        const sections: { label: string; content: string }[] = [];
        const lines = text.split('\n').filter(line => line.trim());
        console.log(text);

        lines.forEach(line => {
            if (line.includes(':')) {
                const [label, content] = line.split(':');
                sections.push({
                    label: label.trim(),
                    content: content.trim(),
                });
            } else {
                sections.push({
                    label: 'Info',
                    content: line.trim(),
                });
            }
        });

        return sections;
    };

    const frontContent = (
        <View>
            <Text style={cardStyles.questionText}>{flashcard.front}</Text>
        </View>
    );

    const backContent = (
        <View style={cardStyles.listContainer}>
            <Text style={cardStyles.questionText}>{flashcard.back}</Text>

        </View>
    );

    return (
        <BaseFlashcard
            front={frontContent}
            back={backContent}
            isFlipped={isFlipped}
            onFlip={onFlip}
            cardType={flashcard.cardType}
            difficulty={flashcard.difficulty}
        />
    );
}
