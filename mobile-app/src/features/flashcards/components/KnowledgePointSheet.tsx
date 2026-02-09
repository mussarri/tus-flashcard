import React from 'react';
import { View, Text, ScrollView, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { KnowledgePoint } from '../types';

interface KnowledgePointSheetProps {
    visible: boolean;
    onDismiss: () => void;
    knowledgePoint: KnowledgePoint;
}

/**
 * Bottom sheet component to display knowledge point details
 */
export default function KnowledgePointSheet({
    visible,
    onDismiss,
    knowledgePoint,
}: KnowledgePointSheetProps) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onDismiss}
        >
            <Pressable style={styles.overlay} onPress={onDismiss}>
                <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.container}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>Bilgi Noktası</Text>
                            <TouchableOpacity
                                onPress={onDismiss}
                                style={styles.closeButton}
                            >
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        {/* Content */}
                        <ScrollView style={styles.content}>
                            {/* Hierarchy */}
                            {(knowledgePoint.lesson || knowledgePoint.topic || knowledgePoint.subtopic) && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Hiyerarşi</Text>
                                    {knowledgePoint.lesson && (
                                        <View style={styles.hierarchyItem}>
                                            <Text style={styles.hierarchyLabel}>Ders:</Text>
                                            <Text style={styles.hierarchyValue}>
                                                {knowledgePoint.lesson.displayName || knowledgePoint.lesson.name}
                                            </Text>
                                        </View>
                                    )}
                                    {knowledgePoint.topic && (
                                        <View style={styles.hierarchyItem}>
                                            <Text style={styles.hierarchyLabel}>Konu:</Text>
                                            <Text style={styles.hierarchyValue}>
                                                {knowledgePoint.topic.displayName || knowledgePoint.topic.name}
                                            </Text>
                                        </View>
                                    )}
                                    {knowledgePoint.subtopic && (
                                        <View style={styles.hierarchyItem}>
                                            <Text style={styles.hierarchyLabel}>Alt Konu:</Text>
                                            <Text style={styles.hierarchyValue}>
                                                {knowledgePoint.subtopic.displayName || knowledgePoint.subtopic.name}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            <View style={styles.divider} />

                            {/* Fact */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Açıklama</Text>
                                <Text style={styles.factText}>{knowledgePoint.fact}</Text>
                            </View>

                            {/* Metadata */}
                            {(knowledgePoint.priority !== undefined || 
                              knowledgePoint.examRelevance !== undefined || 
                              knowledgePoint.examPattern) && (
                                <>
                                    <View style={styles.divider} />
                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>Ek Bilgiler</Text>
                                        
                                        {knowledgePoint.priority !== undefined && (
                                            <View style={styles.metadataRow}>
                                                <Text style={styles.metadataLabel}>Öncelik:</Text>
                                                <View style={[
                                                    styles.priorityBadge,
                                                    { backgroundColor: getPriorityColor(knowledgePoint.priority) }
                                                ]}>
                                                    <Text style={styles.priorityText}>
                                                        {knowledgePoint.priority}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {knowledgePoint.examRelevance !== undefined && (
                                            <View style={styles.metadataRow}>
                                                <Text style={styles.metadataLabel}>Sınav İlgisi:</Text>
                                                <Text style={styles.metadataValue}>
                                                    {(knowledgePoint.examRelevance * 100).toFixed(0)}%
                                                </Text>
                                            </View>
                                        )}

                                        {knowledgePoint.examPattern && (
                                            <View style={styles.metadataRow}>
                                                <Text style={styles.metadataLabel}>Sınav Deseni:</Text>
                                                <Text style={styles.patternText}>
                                                    {formatExamPattern(knowledgePoint.examPattern)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// Helper functions
function getPriorityColor(priority: number): string {
    if (priority >= 8) return '#ef4444'; // High priority - Red
    if (priority >= 5) return '#f59e0b'; // Medium priority - Orange
    return '#10b981'; // Low priority - Green
}

function formatExamPattern(pattern: string): string {
    return pattern
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        minHeight: 400,
    },
    container: {
        maxHeight: '100%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1f2937',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        fontSize: 20,
        color: '#6b7280',
    },
    content: {
        padding: 20,
        maxHeight: 500,
    },
    section: {
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    hierarchyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    hierarchyLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
        width: 80,
    },
    hierarchyValue: {
        fontSize: 14,
        color: '#1f2937',
        flex: 1,
    },
    factText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#1f2937',
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 16,
    },
    metadataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    metadataLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
        width: 120,
    },
    metadataValue: {
        fontSize: 14,
        color: '#1f2937',
    },
    priorityBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    priorityText: {
        fontSize: 13,
        fontWeight: '600',
        color: 'white',
    },
    patternText: {
        fontSize: 14,
        color: '#3b82f6',
        fontWeight: '500',
    },
});
