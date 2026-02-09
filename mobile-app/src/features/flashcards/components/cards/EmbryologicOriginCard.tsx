import React from 'react';
import { View, Text } from 'react-native';
import BaseFlashcard from './BaseFlashcard';
import { Flashcard } from '../../types';
import { cardStyles } from './CardStyles';

interface EmbryologicOriginCardProps {
    flashcard: Flashcard;
    isFlipped: boolean;
    onFlip: () => void;
}

/**
 * EMBRYOLOGIC_ORIGIN Card Component
 * Developmental anatomy: "What is the embryologic origin of [structure]?"
 */
export default function EmbryologicOriginCard({
    flashcard,
    isFlipped,
    onFlip,
}: EmbryologicOriginCardProps) {
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
