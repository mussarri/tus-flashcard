import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";

import BaseFlashcard from "./BaseFlashcard";
import { Flashcard, VisualStatus } from "../../types";
import { cardStyles } from "./CardStyles";

interface StructureIdCardProps {
  flashcard: Flashcard;
  isFlipped: boolean;
  onFlip: () => void;
}

/**
 * STRUCTURE_ID Card Component
 * Visual-based identification: "What is this structure?"
 * Requires image with highlighted region
 */
export default function StructureIdCard({
  flashcard,
  isFlipped,
  onFlip,
}: StructureIdCardProps) {
  const hasImage = flashcard.imageAssetId;
  const imageUrl =
    process.env.EXPO_PUBLIC_API_URL +
    `/api/student/flashcards/visual-assets/${flashcard.imageAssetId}`;

  const frontContent = (
    <View>
      {/* Image with highlighted region */}
      <View style={cardStyles.imageContainer}>
        {hasImage ? (
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
                ? "Image pending upload"
                : "Image not available"}
            </Text>
          </View>
        )}
      </View>

      {/* Question */}
      <Text style={cardStyles.questionText}>{flashcard.front}</Text>
      {flashcard.highlightRegion && (
        <Text style={[cardStyles.answerText, { opacity: 0.6 }]}>
          Region: {flashcard.highlightRegion}
        </Text>
      )}
    </View>
  );

  const backContent = (
    <View>
      {/* Same image for context */}
      <View style={cardStyles.imageContainer}>
        {hasImage ? (
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
                ? "Image pending upload"
                : "Image not available"}
            </Text>
          </View>
        )}
        <Text style={cardStyles.answerText}>{flashcard.back}</Text>
      </View>

      {/* Answer */}
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
