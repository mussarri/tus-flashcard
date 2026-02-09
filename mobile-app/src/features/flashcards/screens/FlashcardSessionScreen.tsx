import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { theme } from "@theme/index";
import { useNextCard, useRespondToCard } from "../hooks/useFlashcardApi";
import FlashcardContainer from "../components/FlashcardContainer";
import { ResponseType } from "../types";
import { RESPONSE_CONFIG } from "../constants/flashcardColors";

/**
 * Flashcard Session Screen
 * Purpose: Display flashcards one by one, collect user responses
 */
export default function FlashcardSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const sessionId = params.sessionId as string;
  const totalCards = parseInt(params.totalCards as string, 10);
  const mode = params.mode as string;

  // State
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Fetch next card
  const {
    data: nextCardData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useNextCard(sessionId);
  const respondMutation = useRespondToCard();

  const currentCard = nextCardData?.card;
  const sessionComplete = nextCardData?.sessionComplete || false;

  // Debug: Log query state changes
  useEffect(() => {
    console.log('🔄 Query state changed:', {
      hasData: !!nextCardData,
      isLoading,
      isFetching,
      position: nextCardData?.position,
      cardId: nextCardData?.card?.id || nextCardData?.card?.cardId,
    });
  }, [nextCardData, isLoading, isFetching]);

  // Reset flip state when card changes
  useEffect(() => {
    console.log('📝 Card position changed:', nextCardData?.position);
    setIsFlipped(false);
    if (nextCardData?.position !== undefined) {
      setCurrentPosition(nextCardData.position);
    }
  }, [nextCardData?.position]);

  // Handle session completion
  useEffect(() => {
    if (sessionComplete) {
      router.replace({
        pathname: "/(flashcards)/summary",
        params: { sessionId },
      });
    }
  }, [sessionComplete, sessionId, router]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleResponse = async (response: ResponseType) => {
    if (!currentCard) {
      console.log('❌ No current card');
      return;
    }

    // Use cardId if available, fallback to id
    const flashcardId = currentCard.cardId || currentCard.id;
    
    console.log('🎯 Handling response:', {
      response,
      flashcardId,
      sessionId,
      currentCard: {
        id: currentCard.id,
        cardId: currentCard.cardId,
        front: currentCard.front?.substring(0, 50),
      }
    });
    
    if (!flashcardId) {
      console.error('❌ No valid card ID found');
      return;
    }

    try {
      // Submit response - mutation will automatically invalidate and refetch next card
      console.log('📤 Submitting response...');
      const result = await respondMutation.mutateAsync({
        cardId: flashcardId,
        request: {
          sessionId,
          response,
        },
      });
      console.log('✅ Response submitted successfully:', result);
      
      // Manually refetch next card
      console.log('🔄 Manually refetching next card...');
      await refetch();
    } catch (err) {
      console.error("❌ Failed to submit response:", err);
      if (err instanceof Error) {
        console.error('Error details:', err.message);
      }
      // TODO: Show error toast
    }
  };

  // Loading state
  if (isLoading && !currentCard) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Kart yükleniyor...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Kart yüklenemedi</Text>
        <Text style={styles.errorSubtext}>Lütfen tekrar deneyin</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No card state
  if (!currentCard) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Kart bulunamadı</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      {/* view with scroll */}
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(currentPosition / totalCards) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentPosition} / {totalCards}
          </Text>
        </View>
      </View>

      {/* Flashcard */}
      <View style={styles.cardContainer}>
        <FlashcardContainer
          flashcard={currentCard as any}
          isFlipped={isFlipped}
          onFlip={handleFlip}
        />
      </View>

      {/* Action Area */}
      <View style={styles.actionArea}>
        {!isFlipped ? (
          // Show Answer Button
          <TouchableOpacity
            style={styles.showAnswerButton}
            onPress={handleFlip}
            activeOpacity={0.8}
          >
            <Text style={styles.showAnswerButtonText}>Cevabı Göster</Text>
          </TouchableOpacity>
        ) : (
          // Feedback Buttons
          <ScrollView
            style={styles.feedbackContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.feedbackPrompt}>
              Bu kartı ne kadar biliyorsun?
            </Text>

            <View style={styles.feedbackButtons}>
              {/* HARD Button */}
              <TouchableOpacity
                style={[
                  styles.feedbackButton,
                  { backgroundColor: RESPONSE_CONFIG.HARD.color },
                ]}
                onPress={() => handleResponse("HARD")}
                activeOpacity={0.8}
                disabled={respondMutation.isPending}
              >
                <Text style={styles.feedbackEmoji}>
                  {RESPONSE_CONFIG.HARD.emoji}
                </Text>
                <View style={styles.feedbackTextContainer}>
                  <Text style={styles.feedbackLabel}>
                    {RESPONSE_CONFIG.HARD.label}
                  </Text>
                  <Text style={styles.feedbackSublabel}>
                    {RESPONSE_CONFIG.HARD.sublabel}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* MEDIUM Button */}
              <TouchableOpacity
                style={[
                  styles.feedbackButton,
                  { backgroundColor: RESPONSE_CONFIG.MEDIUM.color },
                ]}
                onPress={() => handleResponse("MEDIUM")}
                activeOpacity={0.8}
                disabled={respondMutation.isPending}
              >
                <Text style={styles.feedbackEmoji}>
                  {RESPONSE_CONFIG.MEDIUM.emoji}
                </Text>
                <View style={styles.feedbackTextContainer}>
                  <Text style={styles.feedbackLabel}>
                    {RESPONSE_CONFIG.MEDIUM.label}
                  </Text>
                  <Text style={styles.feedbackSublabel}>
                    {RESPONSE_CONFIG.MEDIUM.sublabel}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* EASY Button */}
              <TouchableOpacity
                style={[
                  styles.feedbackButton,
                  { backgroundColor: RESPONSE_CONFIG.EASY.color },
                ]}
                onPress={() => handleResponse("EASY")}
                activeOpacity={0.8}
                disabled={respondMutation.isPending}
              >
                <Text style={styles.feedbackEmoji}>
                  {RESPONSE_CONFIG.EASY.emoji}
                </Text>
                <View style={styles.feedbackTextContainer}>
                  <Text style={styles.feedbackLabel}>
                    {RESPONSE_CONFIG.EASY.label}
                  </Text>
                  <Text style={styles.feedbackSublabel}>
                    {RESPONSE_CONFIG.EASY.sublabel}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {respondMutation.isPending && (
              <ActivityIndicator
                size="small"
                color={theme.colors.primary}
                style={styles.loadingIndicator}
              />
            )}
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  progressContainer: {
    gap: theme.spacing.xs,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.gray[200],
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontFamily: theme.typography.fonts.bodyBold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[600],
    textAlign: "center",
  },
  cardContainer: {
    flex: 1,
    height: "auto",
    borderTopColor: theme.colors.gray[200],
    borderTopWidth: 1,
    padding: theme.spacing.lg,
    justifyContent: "center",
  },
  actionArea: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    borderTopColor: theme.colors.gray[200],
    borderTopWidth: 1,
  },
  showAnswerButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: 12,
    alignItems: "center",
    ...theme.shadows.md,
  },
  showAnswerButtonText: {
    fontFamily: theme.typography.fonts.bodyBold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.white,
  },
  feedbackContainer: {
    overflow: "scroll",
  },
  feedbackPrompt: {
    fontFamily: theme.typography.fonts.heading,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  feedbackButtons: {
    gap: theme.spacing.sm,
  },
  feedbackButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 12,
    minHeight: 64,
    ...theme.shadows.sm,
  },
  feedbackEmoji: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  feedbackTextContainer: {
    flex: 1,
  },
  feedbackLabel: {
    fontFamily: theme.typography.fonts.bodyBold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.white,
    marginBottom: 2,
  },
  feedbackSublabel: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    color: "rgba(255, 255, 255, 0.9)",
  },
  loadingIndicator: {
    marginTop: theme.spacing.md,
  },
  loadingText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.gray[600],
    marginTop: theme.spacing.md,
  },
  errorText: {
    fontFamily: theme.typography.fonts.heading,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  errorSubtext: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.gray[600],
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: theme.typography.fonts.bodyBold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.white,
  },
});
