import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { CardType, Difficulty, KnowledgePoint } from "../../types";
import { cardStyles, getTierColor, getTierLabel } from "./CardStyles";
import KnowledgePointSheet from "../KnowledgePointSheet";

interface BaseFlashcardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  isFlipped: boolean;
  onFlip: () => void;
  cardType: CardType;
  difficulty: Difficulty;
  knowledgePoint?: KnowledgePoint | null;
}

/**
 * Base flashcard component with flip animation and tier styling
 */
export default function BaseFlashcard({
  front,
  back,
  isFlipped,
  onFlip,
  cardType,
  difficulty,
  knowledgePoint,
}: BaseFlashcardProps) {
  const [showKnowledgePoint, setShowKnowledgePoint] = useState(false);
  const tierColor = getTierColor(cardType);
  const tierLabel = getTierLabel(cardType);

  const handleExplanationPress = (e: any) => {
    e.stopPropagation(); // Prevent card flip when pressing explanation button
    setShowKnowledgePoint(true);
  };

  return (
    <>
      <Pressable
        onPress={onFlip}
        style={cardStyles.cardContainer}
        accessibilityRole="button"
        accessibilityLabel={
          isFlipped ? "Tap to see question" : "Tap to see answer"
        }
      >
        {/* Card Header */}
        <View style={cardStyles.cardHeader}>
          <View style={[cardStyles.tierBadge, { backgroundColor: tierColor }]}>
            <Text style={cardStyles.tierText}>{tierLabel}</Text>
          </View>
          <View style={cardStyles.difficultyBadge}>
            <Text style={cardStyles.difficultyText}>{difficulty}</Text>
          </View>
        </View>

        {/* Card Content */}
        <ScrollView
          style={cardStyles.cardContent}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: isFlipped ? "flex-start" : "center",
            paddingVertical: 16,
          }}
          showsVerticalScrollIndicator={true}
        >
          {isFlipped ? (
            <View>
              {back}
              {/* Explanation Button (shown on back when knowledgePoint exists) */}
              {knowledgePoint && (
                <TouchableOpacity
                  style={styles.explanationButton}
                  onPress={handleExplanationPress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.explanationButtonText}>💡 Açıklama</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            front
          )}
        </ScrollView>

        {/* Flip Indicator */}
        {!isFlipped && (
          <View style={cardStyles.flipIndicator}>
            <Text style={cardStyles.flipIndicatorText}>
              Tap to reveal answer
            </Text>
          </View>
        )}
      </Pressable>

      {/* Knowledge Point Sheet */}
      {knowledgePoint && (
        <KnowledgePointSheet
          visible={showKnowledgePoint}
          onDismiss={() => setShowKnowledgePoint(false)}
          knowledgePoint={knowledgePoint}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  explanationButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  explanationButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
