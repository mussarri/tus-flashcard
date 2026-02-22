import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import BaseFlashcard from './BaseFlashcard';
import { Flashcard } from '../../types';
import { cardStyles } from './CardStyles';

interface HighYieldDistinctionCardProps {
    flashcard: Flashcard;
    isFlipped: boolean;
    onFlip: () => void;
}

/**
 * HIGH_YIELD_DISTINCTION Card Component
 * Comparison card for commonly confused structures: "X vs Y: Key differences?"
 * Triggered by trap-loop detection
 */
export default function HighYieldDistinctionCard({
    flashcard,
    isFlipped,
    onFlip,
}: HighYieldDistinctionCardProps) {
    // Parse comparison data (Structure A vs Structure B)
    const parseComparison = (text: string) => {
        const sections = text.split(/\n\n|\n-{3,}\n/);
        return sections.map(section => section.trim()).filter(s => s.length > 0);
    };

    const hasImage = !!flashcard.imageAssetId;
    const imageUrl = hasImage
        ? process.env.EXPO_PUBLIC_API_URL + `/admin/visual-assets/${flashcard.imageAssetId}`
        : null;

    const frontContent = (
        <View>
            <Text style={cardStyles.questionText}>{flashcard.front}</Text>
            {hasImage && (
                <View style={cardStyles.imageContainer}>
                    <Image
                        source={{ uri: imageUrl! }}
                        style={cardStyles.image}
                        contentFit="contain"
                        transition={200}
                    />
                </View>
            )}
        </View>
    );

    const backContent = (
        <View style={cardStyles.comparisonContainer}>
            {parseComparison(flashcard.back).map((section, index) => (
                <View key={index} style={cardStyles.comparisonCell}>
                    <Text style={cardStyles.comparisonText}>{section}</Text>
                </View>
            ))}
            {hasImage && (
                <View style={cardStyles.imageContainer}>
                    <Image
                        source={{ uri: imageUrl! }}
                        style={cardStyles.image}
                        contentFit="contain"
                        transition={200}
                    />
                </View>
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
