import React from 'react';
import { View, Text } from 'react-native';
import BaseFlashcard from './BaseFlashcard';
import { Flashcard } from '../../types';
import { cardStyles } from './CardStyles';

interface ContentsOfSpaceCardProps {
    flashcard: Flashcard;
    isFlipped: boolean;
    onFlip: () => void;
}

/**
 * CONTENTS_OF_SPACE Card Component
 * List-based enumeration: "List the contents of [space name]"
 */
export default function ContentsOfSpaceCard({
    flashcard,
    isFlipped,
    onFlip,
}: ContentsOfSpaceCardProps) {
    // Parse back content as list items (split by newline or bullet points)
    const parseListItems = (text: string): string[] => {
        return text
            .split(/\n|•/)
            .map(item => item.trim())
            .filter(item => item.length > 0);
    };

    const frontContent = (
        <View>
            <Text style={cardStyles.questionText}>{flashcard.front}</Text>
        </View>
    );

    const backContent = (
        <View style={cardStyles.listContainer}>
            {parseListItems(flashcard.back).map((item, index) => (
                <View key={index} style={cardStyles.listItem}>
                    <View style={cardStyles.listBullet} />
                    <Text style={cardStyles.listItemText}>{item}</Text>
                </View>
            ))}
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
