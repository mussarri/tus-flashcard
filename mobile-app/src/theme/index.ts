import { Platform } from 'react-native';

export const palette = {
    primary: '#0891B2',
    secondary: '#22D3EE',
    cta: '#22C55E',
    background: '#F0FDFA',
    text: '#134E4A',
    white: '#FFFFFF',
    info: '#3B82F6',
    warning: '#F59E0B',
    error: '#EF4444',
    gray: {
        50: '#F9FAFB',
        100: '#F3F4F6',
        200: '#E5E7EB',
        300: '#D1D5DB',
        400: '#9CA3AF',
        500: '#6B7280',
        600: '#4B5563',
        700: '#374151',
        800: '#1F2937',
        900: '#111827',
    },
} as const;

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
} as const;

export const typography = {
    fonts: {
        heading: 'Figtree_700Bold',
        body: 'NotoSans_400Regular',
        bodyBold: 'NotoSans_700Bold',
        subheading: 'Figtree_500Medium',
    },
    sizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 20,
        xl: 24,
        '2xl': 32,
    },
} as const;

export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 10,
    },
    xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.15,
        shadowRadius: 25,
        elevation: 20,
    },
} as const;

export const theme = {
    colors: palette,
    spacing,
    typography,
    shadows,
} as const;
