import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { theme } from '@theme/index';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Custom Tab Bar Component
 * Beautiful, minimal design for medical exam app
 * Following MASTER.md design system: Medical teal + health green
 */
export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <View style={styles.tabBar}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    const onLongPress = () => {
                        navigation.emit({
                            type: 'tabLongPress',
                            target: route.key,
                        });
                    };

                    // Get icon component
                    const iconComponent = options.tabBarIcon?.({
                        focused: isFocused,
                        color: isFocused ? theme.colors.primary : theme.colors.gray[400],
                        size: 24,
                    });

                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            style={styles.tabButton}
                            activeOpacity={0.7}
                        >
                            <View
                                style={[
                                    styles.iconContainer,
                                    isFocused && styles.iconContainerActive,
                                ]}
                            >
                                {iconComponent}
                            </View>
                            {isFocused && <View style={styles.activeIndicator} />}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.sm,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: theme.colors.white,
        borderRadius: 28,
        paddingVertical: 6,
        paddingHorizontal: 4,
        marginBottom: theme.spacing.sm,
        // Following MASTER.md shadow-lg spec
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 10,
        // Subtle border for definition
        borderWidth: 1,
        borderColor: 'rgba(8, 145, 178, 0.08)', // Primary color with opacity
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.xs,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    iconContainerActive: {
        backgroundColor: theme.colors.background, // #F0FDFA - medical teal background
        // Following MASTER.md shadow-md spec for active state
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 2,
        width: 28,
        height: 3.5,
        borderRadius: 2,
        backgroundColor: theme.colors.primary, // #0891B2 - medical teal
    },
});
