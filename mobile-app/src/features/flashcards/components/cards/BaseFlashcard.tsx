import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { CardType, Difficulty, KnowledgePoint, TopicExplanation } from "../../types";
import { cardStyles, getTierColor, getTierLabel } from "./CardStyles";
import KnowledgePointSheet from "../KnowledgePointSheet";
import TopicExplanationSheet from "../TopicExplanationSheet";
import { flashcardApiService } from "../../services";

interface BaseFlashcardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  isFlipped: boolean;
  onFlip: () => void;
  cardType: CardType;
  difficulty: Difficulty;
  knowledgePoint?: KnowledgePoint | null;
  flashcardId: string;
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
  flashcardId,
}: BaseFlashcardProps) {
  const [showKnowledgePoint, setShowKnowledgePoint] = useState(false);
  const [showTopicExplanation, setShowTopicExplanation] = useState(false);
  const [topicExplanation, setTopicExplanation] = useState<TopicExplanation | null>(null);
  const [topicLoading, setTopicLoading] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);

  useEffect(() => {
    setTopicExplanation(null);
    setShowTopicExplanation(false);
    setTopicError(null);
  }, [flashcardId]);
  const tierColor = getTierColor(cardType);
  const tierLabel = getTierLabel(cardType);

  const handleExplanationPress = (e: any) => {
    e.stopPropagation(); // Prevent card flip when pressing explanation button
    setShowKnowledgePoint(true);
  };

  const handleTopicExplanationPress = async (e: any) => {
    e.stopPropagation();
    setShowTopicExplanation(true);
    if (topicExplanation || topicLoading) return;
    setTopicLoading(true);
    setTopicError(null);
    try {
      setTopicExplanation(await flashcardApiService.getOrCreateTopicExplanation(flashcardId));
    } catch {
      setTopicError('Konu anlatımı yüklenemedi. Tekrar denemek için pencereyi kapatıp düğmeye basın.');
    } finally {
      setTopicLoading(false);
    }
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
              <TouchableOpacity
                style={styles.topicButton}
                onPress={handleTopicExplanationPress}
                activeOpacity={0.7}
              >
                <Text style={styles.explanationButtonText}>📖 Konu anlatımı</Text>
              </TouchableOpacity>
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
      <TopicExplanationSheet
        visible={showTopicExplanation}
        onDismiss={() => setShowTopicExplanation(false)}
        explanation={topicExplanation}
        loading={topicLoading}
        error={topicError}
      />
    </>
  );
}

const styles = StyleSheet.create({
  topicButton: {
    backgroundColor: '#0f766e',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
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
