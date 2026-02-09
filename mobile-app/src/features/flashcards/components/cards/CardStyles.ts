import { StyleSheet } from "react-native";
import { theme } from "@theme/index";
import { CardType } from "../../types";

/**
 * Get tier color based on card type
 */
export const getTierColor = (cardType: CardType): string => {
  // CORE tier - Primary blue
  if (
    [
      CardType.STRUCTURE_ID,
      CardType.CONTENTS_OF_SPACE,
      CardType.FUNCTIONAL_ANATOMY,
    ].includes(cardType)
  ) {
    return theme.colors.primary;
  }

  // INTERMEDIATE tier - Secondary purple
  if (
    [
      CardType.RELATIONS_BORDERS,
      CardType.LESION_ANATOMY,
      CardType.EMBRYOLOGIC_ORIGIN,
    ].includes(cardType)
  ) {
    return theme.colors.secondary;
  }

  // ADVANCED tier - CTA orange
  if (
    [
      CardType.CLINICAL_CORRELATION,
      CardType.HIGH_YIELD_DISTINCTION,
      CardType.EXCEPT_TRAP,
      CardType.TOPOGRAPHIC_MAP,
    ].includes(cardType)
  ) {
    return theme.colors.cta;
  }

  // Legacy types - gray
  return theme.colors.gray[600];
};

/**
 * Get tier label based on card type
 */
export const getTierLabel = (cardType: CardType): string => {
  if (
    [
      CardType.STRUCTURE_ID,
      CardType.CONTENTS_OF_SPACE,
      CardType.FUNCTIONAL_ANATOMY,
    ].includes(cardType)
  ) {
    return "CORE";
  }

  if (
    [
      CardType.RELATIONS_BORDERS,
      CardType.LESION_ANATOMY,
      CardType.EMBRYOLOGIC_ORIGIN,
    ].includes(cardType)
  ) {
    return "INTERMEDIATE";
  }

  if (
    [
      CardType.CLINICAL_CORRELATION,
      CardType.HIGH_YIELD_DISTINCTION,
      CardType.EXCEPT_TRAP,
      CardType.TOPOGRAPHIC_MAP,
    ].includes(cardType)
  ) {
    return "ADVANCED";
  }

  return "LEGACY";
};

/**
 * Shared styles for all card components
 */
export const cardStyles = StyleSheet.create({
  // Card container
  cardContainer: {
    height: "100%",
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: theme.spacing.lg,
    ...theme.shadows.lg,
  },

  // Card header
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },

  tierBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },

  tierText: {
    fontFamily: theme.typography.fonts.bodyBold,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.white,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  difficultyBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: theme.colors.gray[200],
  },

  difficultyText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.gray[700],
  },

  // Card content
  cardContent: {
    flex: 1,
  },

  questionText: {
    fontFamily: theme.typography.fonts.heading,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.text,
    lineHeight: 32,
    marginBottom: theme.spacing.md,
  },

  answerText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text,
    lineHeight: 28,
  },

  // Image container
  imageContainer: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.gray[100],
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  imagePlaceholderText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[500],
  },

  // List styles (for CONTENTS_OF_SPACE)
  listContainer: {
    gap: theme.spacing.sm,
  },

  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },

  listBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginTop: 8,
  },

  listItemText: {
    flex: 1,
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    lineHeight: 24,
  },

  // Grid styles (for RELATIONS_BORDERS)
  gridContainer: {
    gap: theme.spacing.sm,
  },

  gridRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },

  gridCell: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },

  gridLabel: {
    fontFamily: theme.typography.fonts.bodyBold,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.gray[600],
    marginBottom: 4,
    textTransform: "uppercase",
  },

  gridValue: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },

  // Comparison table (for HIGH_YIELD_DISTINCTION)
  comparisonContainer: {
    gap: theme.spacing.md,
  },

  comparisonRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },

  comparisonCell: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: 8,
  },

  comparisonHeader: {
    fontFamily: theme.typography.fonts.bodyBold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    marginBottom: 4,
  },

  comparisonText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },

  // Flip indicator
  flipIndicator: {
    position: "absolute",
    bottom: theme.spacing.md,
    alignSelf: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.gray[100],
    borderRadius: 20,
  },

  flipIndicatorText: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[600],
  },
});
