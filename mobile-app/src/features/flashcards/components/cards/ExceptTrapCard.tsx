import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import BaseFlashcard from "./BaseFlashcard";
import { Flashcard } from "../../types";
import { cardStyles } from "./CardStyles";

interface ExceptTrapCardProps {
  flashcard: Flashcard;
  isFlipped: boolean;
  onFlip: () => void;
}

/**
 * EXCEPT_TRAP Card Component
 * Exception-based trap pattern: "All are true EXCEPT:"
 * Tracks which distractor user selected
 */
export default function ExceptTrapCard({
  flashcard,
  isFlipped,
  onFlip,
}: ExceptTrapCardProps) {
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
      <Text style={cardStyles.questionText}>{flashcard.front}</Text>
      {flashcard.trapData && (
        <View style={cardStyles.listContainer}>
          {flashcard.trapData.distractors.map((distractor, index) => (
            <View key={index} style={cardStyles.listItem}>
              <Text style={cardStyles.listItemText}>
                {String.fromCharCode(65 + index)}. {distractor}
              </Text>
            </View>
          ))}
        </View>
      )}
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
      <Text style={[cardStyles.answerText, { marginBottom: 16 }]}>
        <Text style={{ fontWeight: "bold" }}>Correct Answer: </Text>
        {flashcard.back}
      </Text>
      {flashcard.trapData && (
        <View style={cardStyles.gridCell}>
          <Text style={cardStyles.gridLabel}>Common Mistake</Text>
          <Text style={cardStyles.gridValue}>
            {flashcard.trapData.commonMistake}
          </Text>
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
