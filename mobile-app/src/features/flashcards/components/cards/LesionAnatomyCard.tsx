import React from 'react';
import { View, Text } from 'react-native';
import BaseFlashcard from './BaseFlashcard';
import { Flashcard } from '../../types';
import { cardStyles } from './CardStyles';

interface LesionAnatomyCardProps {
    flashcard: Flashcard;
    isFlipped: boolean;
    onFlip: () => void;
}

/**
 * LESION_ANATOMY Card Component
 * Clinical manifestations: "What happens if [structure] is damaged?"
 */
export default function LesionAnatomyCard({
    flashcard,
    isFlipped,
    onFlip,
}: LesionAnatomyCardProps) {
    const frontContent = (
        <View>
            <Text style={cardStyles.questionText}>{flashcard.front}</Text>
        </View>
    );

    const backContent = (
        <View>
            <Text style={cardStyles.answerText}>{flashcard.back}</Text>
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
            knowledgePoint={flashcard.knowledgePoint}
        />
    );
}
