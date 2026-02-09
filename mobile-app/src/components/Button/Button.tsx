import React from 'react';
import { Text, Pressable, Animated } from 'react-native';
import { styles } from './Button.styles';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'small' | 'medium' | 'large';
    fullWidth?: boolean;
    disabled?: boolean;
    style?: any;
    iconRight?: string; // Placeholder for now or implement if needed
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    fullWidth = false,
    disabled = false,
    style
}) => {
    const animatedValue = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(animatedValue, {
            toValue: 0.96,
            useNativeDriver: true,
            speed: 50,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(animatedValue, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
        }).start();
    };

    const getVariantStyle = () => {
        switch (variant) {
            case 'secondary': return styles.secondary;
            case 'outline': return styles.outline;
            default: return styles.primary;
        }
    };

    const getSizeStyle = () => {
        switch (size) {
            case 'small': return styles.small;
            case 'large': return styles.large;
            default: return {};
        }
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={({ pressed }) => [
                styles.container,
                getVariantStyle(),
                getSizeStyle(),
                fullWidth && styles.fullWidth,
                disabled && styles.disabled,
                style,
            ]}
        >
            <Animated.View style={{ transform: [{ scale: animatedValue }] }}>
                <Text style={[
                    styles.text,
                    variant === 'primary' ? styles.textPrimary :
                        variant === 'outline' ? styles.textOutline : styles.textSecondary,
                    size === 'small' && styles.textSmall
                ]}>
                    {title}
                </Text>
            </Animated.View>
        </Pressable>
    );
};
