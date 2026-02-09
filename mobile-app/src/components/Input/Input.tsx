import React, { useState } from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { theme } from '@theme/index';
import { styles } from './Input.styles';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    style,
    onFocus,
    onBlur,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = (e: any) => {
        setIsFocused(true);
        if (onFocus) onFocus(e);
    };

    const handleBlur = (e: any) => {
        setIsFocused(false);
        if (onBlur) onBlur(e);
    };

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[
                    styles.input,
                    isFocused && styles.inputFocus,
                    error && styles.inputError,
                    style,
                ]}
                placeholderTextColor={theme.colors.gray[400]}
                onFocus={handleFocus}
                onBlur={handleBlur}
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};
