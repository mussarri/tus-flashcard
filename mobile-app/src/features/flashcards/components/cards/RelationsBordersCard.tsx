import React from 'react';
import { View, Text } from 'react-native';
import BaseFlashcard from './BaseFlashcard';
import { Flashcard } from '../../types';
import { cardStyles } from './CardStyles';

interface RelationsBordersCardProps {
    flashcard: Flashcard;
    isFlipped: boolean;
    onFlip: () => void;
}

/**
 * RELATIONS_BORDERS Card Component
 * Spatial relationships: "What are the borders/relations of [structure]?"
 * Grid layout showing anterior/posterior/medial/lateral/superior/inferior
 */
export default function RelationsBordersCard({
    flashcard,
    isFlipped,
    onFlip,
}: RelationsBordersCardProps) {
    // Parse spatial relations from answer
    const parseRelations = (text: string) => {
        const relations: Record<string, string> = {};
        const lines = text.split('\n').filter(line => line.trim());

        lines.forEach(line => {
            const match = line.match(/(Anterior|Posterior|Medial|Lateral|Superior|Inferior):\s*(.+)/i);
            if (match) {
                relations[match[1]] = match[2].trim();
            }
        });

        return relations;
    };

    const frontContent = (
        <View>
            <Text style={cardStyles.questionText}>{flashcard.front}</Text>
        </View>
    );

    const backContent = (
        <View>
            {/* Show parsed grid if available */}
            {Object.keys(parseRelations(flashcard.back)).length > 0 ? (
                <View style={cardStyles.gridContainer}>
                    {Object.entries(parseRelations(flashcard.back)).map(([direction, structure]) => (
                        <View key={direction} style={cardStyles.gridCell}>
                            <Text style={cardStyles.gridLabel}>{direction}</Text>
                            <Text style={cardStyles.gridValue}>{structure}</Text>
                        </View>
                    ))}
                </View>
            ) : (
                /* Fallback to plain text if parsing fails */
                <Text style={cardStyles.answerText}>{flashcard.back}</Text>
            )}
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
