import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import BaseFlashcard from "./BaseFlashcard";
import { Flashcard } from "../../types";
import { cardStyles } from "./CardStyles";

interface ClinicalCorrelationCardProps {
  flashcard: Flashcard;
  isFlipped: boolean;
  onFlip: () => void;
}

/**
 * CLINICAL_CORRELATION Card Component
 * Case-based diagnostic reasoning: Patient vignette → affected structure
 */
export default function ClinicalCorrelationCard({
  flashcard,
  isFlipped,
  onFlip,
}: ClinicalCorrelationCardProps) {
  const hasImage = !!flashcard.imageAssetId;
  const imageUrl = hasImage
    ? process.env.EXPO_PUBLIC_API_URL +
      `/admin/visual-assets/${flashcard.imageAssetId}`
    : null;

  const frontContent = (
    <View>
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
      <Text style={[cardStyles.questionText, { fontSize: 18 }]}>
        {flashcard.front}
      </Text>
    </View>
  );

  const backContent = (
    <View>
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
