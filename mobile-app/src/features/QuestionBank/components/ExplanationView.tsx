import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { theme } from "@theme/index";
import { Ionicons } from "@expo/vector-icons";
import { AnswerResult, QuestionOptionId } from "../types";

interface ExplanationViewProps {
  result: AnswerResult;
}

type CollapsibleSection = "trap" | "clinical" | "spatial";

export const ExplanationView: React.FC<ExplanationViewProps> = ({ result }) => {
  const [expandedOption, setExpandedOption] = useState<QuestionOptionId | null>(
    null,
  );
  const [expandedSections, setExpandedSections] = useState<
    Set<CollapsibleSection>
  >(new Set());

  const toggleOption = (id: QuestionOptionId) => {
    setExpandedOption(expandedOption === id ? null : id);
  };

  const toggleSection = (section: CollapsibleSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <View style={styles.container}>
      {/* Result Banner */}
      <View
        style={[
          styles.banner,
          result.isCorrect ? styles.bannerCorrect : styles.bannerWrong,
        ]}
      >
        <Ionicons
          name={result.isCorrect ? "checkmark-circle" : "close-circle"}
          size={24}
          color={theme.colors.white}
        />
        <Text style={styles.bannerText}>
          {result.isCorrect ? "Correct!" : "Incorrect"}
        </Text>
      </View>

      {/* Main Explanation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Explanation</Text>
        <Text style={styles.text}>{result.mainExplanation}</Text>
      </View>

      {/* Per Option Explanations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Why other options are incorrect?
        </Text>
        {(["A", "B", "C", "D", "E"] as QuestionOptionId[]).map((optId) => {
          const meta = result.optionsMetadata?.[optId];
          if (!meta?.wouldBeCorrectIf) return null;
          // Don't show for the correct option usually, or show as "Correct because..."
          // The requirements say: "Per-option explanation from optionsMetadata[opt].wouldBeCorrectIf"

          const isExpanded = expandedOption === optId;

          return (
            <TouchableOpacity
              key={optId}
              style={styles.optionRow}
              onPress={() => toggleOption(optId)}
              activeOpacity={0.7}
            >
              <View style={styles.optionHeader}>
                <View style={styles.optionBadge}>
                  <Text style={styles.optionBadgeText}>{optId}</Text>
                </View>
                <Text style={styles.optionSummary} numberOfLines={1}>
                  {isExpanded ? "Hide details" : "Tap for details"}
                </Text>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.colors.gray[500]}
                />
              </View>
              {isExpanded && (
                <Text style={styles.optionDetail}>{meta.wouldBeCorrectIf}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Exam Trap - Collapsible */}
      {result.examTrap &&
        (result.examTrap.confusedWith || result.examTrap.keyDifference) && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => toggleSection("trap")}
              activeOpacity={0.7}
            >
              <View style={styles.collapsibleHeaderContent}>
                <Ionicons
                  name="warning"
                  size={20}
                  color={theme.colors.warning}
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>⚠️ Common Exam Trap</Text>
              </View>
              <Ionicons
                name={
                  expandedSections.has("trap") ? "chevron-up" : "chevron-down"
                }
                size={20}
                color={theme.colors.gray[500]}
              />
            </TouchableOpacity>
            {expandedSections.has("trap") && (
              <View style={styles.collapsibleContent}>
                {result.examTrap.confusedWith && (
                  <View style={styles.trapItem}>
                    <Text style={styles.trapLabel}>Often confused with:</Text>
                    <Text style={styles.text}>
                      {result.examTrap.confusedWith}
                    </Text>
                  </View>
                )}
                {result.examTrap.keyDifference && (
                  <View style={styles.trapItem}>
                    <Text style={styles.trapLabel}>Key difference:</Text>
                    <Text style={styles.text}>
                      {result.examTrap.keyDifference}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

      {/* Clinical Correlation - Collapsible */}
      {result.clinicalCorrelation && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => toggleSection("clinical")}
            activeOpacity={0.7}
          >
            <View style={styles.collapsibleHeaderContent}>
              <Ionicons
                name="medical"
                size={20}
                color={theme.colors.primary}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>🩺 Clinical Correlation</Text>
            </View>
            <Ionicons
              name={
                expandedSections.has("clinical") ? "chevron-up" : "chevron-down"
              }
              size={20}
              color={theme.colors.gray[500]}
            />
          </TouchableOpacity>
          {expandedSections.has("clinical") && (
            <View style={styles.collapsibleContent}>
              <Text style={styles.text}>{result.clinicalCorrelation}</Text>
            </View>
          )}
        </View>
      )}

      {/* Spatial Contexts (Anatomy) - Collapsible */}
      {result.spatialContexts && result.spatialContexts.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => toggleSection("spatial")}
            activeOpacity={0.7}
          >
            <View style={styles.collapsibleHeaderContent}>
              <Ionicons
                name="cube"
                size={20}
                color={theme.colors.info}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>🧠 Anatomical Relations</Text>
            </View>
            <Ionicons
              name={
                expandedSections.has("spatial") ? "chevron-up" : "chevron-down"
              }
              size={20}
              color={theme.colors.gray[500]}
            />
          </TouchableOpacity>
          {expandedSections.has("spatial") && (
            <View style={styles.collapsibleContent}>
              {result.spatialContexts.map((ctx, idx) => (
                <View key={idx} style={styles.spatialItem}>
                  <Text style={styles.spatialText}>
                    <Text style={styles.spatialBold}>{ctx.anatomySubject}</Text>{" "}
                    <Text style={styles.spatialRelation}>
                      {ctx.spatialRelation}
                    </Text>{" "}
                    <Text style={styles.spatialBold}>
                      {ctx.relatedStructure}
                    </Text>
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Remediation */}
      {result.remediation && !result.isCorrect && (
        <View style={styles.remediationBox}>
          <Text style={styles.remediationTitle}>📚 Suggested Review</Text>
          <Text style={styles.remediationText}>
            Review related knowledge points to strengthen understanding.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: 8,
    marginBottom: theme.spacing.lg,
  },
  bannerCorrect: {
    backgroundColor: theme.colors.cta,
  },
  bannerWrong: {
    backgroundColor: theme.colors.error,
  },
  bannerText: {
    color: theme.colors.white,
    fontFamily: theme.typography.fonts.heading,
    fontSize: theme.typography.sizes.lg,
    marginLeft: theme.spacing.sm,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontFamily: theme.typography.fonts.heading,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  text: {
    fontFamily: theme.typography.fonts.body,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.gray[700],
    lineHeight: 24,
  },
  // Option Rows
  optionRow: {
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.gray[100],
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.sm,
  },
  optionBadgeText: {
    fontSize: 12,
    fontFamily: theme.typography.fonts.heading,
    color: theme.colors.gray[600],
  },
  optionSummary: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[500],
  },
  optionDetail: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[800],
    paddingLeft: 32, // Indent to align with text start
    fontStyle: "italic",
  },
  remediationBox: {
    backgroundColor: "#FEF3C7",
    padding: theme.spacing.md,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  remediationTitle: {
    fontFamily: theme.typography.fonts.heading,
    color: "#92400E",
    marginBottom: 4,
  },
  remediationText: {
    fontFamily: theme.typography.fonts.body,
    color: "#92400E",
    fontSize: theme.typography.sizes.sm,
  },
  // Collapsible sections
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.gray[50],
    padding: theme.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  collapsibleHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionIcon: {
    marginRight: theme.spacing.sm,
  },
  collapsibleContent: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  trapItem: {
    marginBottom: theme.spacing.md,
  },
  trapLabel: {
    fontFamily: theme.typography.fonts.heading,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[700],
    marginBottom: theme.spacing.xs,
  },
  spatialItem: {
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  spatialText: {
    fontSize: theme.typography.sizes.sm,
    lineHeight: 20,
  },
  spatialBold: {
    fontFamily: theme.typography.fonts.heading,
    color: theme.colors.text,
  },
  spatialRelation: {
    fontStyle: "italic",
    color: theme.colors.gray[600],
  },
});
