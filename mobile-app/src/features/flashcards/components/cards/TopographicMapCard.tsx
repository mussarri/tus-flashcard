import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import BaseFlashcard from './BaseFlashcard';
import { Flashcard, VisualStatus } from '../../types';
import { cardStyles } from './CardStyles';

interface TopographicMapCardProps {
    flashcard: Flashcard;
    isFlipped: boolean;
    onFlip: () => void;
}

/**
 * TOPOGRAPHIC_MAP Card Component
 * Comprehensive spatial integration: "Map all structures in [region]"
 * Requires layered anatomical map image
 */
export default function TopographicMapCard({
    flashcard,
    isFlipped,
    onFlip,
}: TopographicMapCardProps) {
    const imageUrl = flashcard.imageAssetId
        ? `${process.env.EXPO_PUBLIC_API_URL}/api/student/flashcards/visual-assets/${flashcard.imageAssetId}`
        : null;

    const frontContent = (
        <View>
            <Text style={cardStyles.questionText}>{flashcard.front}</Text>
            {flashcard.visualContext && (
                <Text style={[cardStyles.answerText, { opacity: 0.6, marginTop: 8 }]}>
                    Region: {flashcard.visualContext}
                </Text>
            )}
        </View>
    );

    const backContent = (
        <View>
            {/* Labeled anatomical map */}
            <View style={cardStyles.imageContainer}>
                {imageUrl ? (
                    <Image
                        source={{ uri: imageUrl }}
                        style={cardStyles.image}
                        contentFit="contain"
                        transition={200}
                    />
                ) : (
                    <View style={cardStyles.imagePlaceholder}>
                        <Text style={cardStyles.imagePlaceholderText}>
                            {flashcard.visualStatus === VisualStatus.REQUIRED
                                ? 'Topographic map pending upload'
                                : 'Map not available'}
                        </Text>
                    </View>
                )}
            </View>

            {/* Text description */}
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
