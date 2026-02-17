/**
 * Shared mobile UI components for LegacyX
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  type TouchableOpacityProps,
  type ViewStyle,
} from 'react-native';
import { theme } from '../theme';

/* ─── GoldButton ─────────────────────────────────────────── */

interface GoldButtonProps extends TouchableOpacityProps {
  label: string;
  loading?: boolean;
  variant?: 'filled' | 'outline';
}

export function GoldButton({
  label,
  loading,
  variant = 'filled',
  disabled,
  style,
  ...rest
}: GoldButtonProps) {
  const isFilled = variant === 'filled';
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isFilled ? styles.buttonFilled : styles.buttonOutline,
        (disabled || loading) && styles.buttonDisabled,
        style as ViewStyle,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.85}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={isFilled ? theme.colors.bg : theme.colors.gold}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            isFilled ? styles.buttonTextFilled : styles.buttonTextOutline,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/* ─── Card ───────────────────────────────────────────────── */

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/* ─── SectionHeader ──────────────────────────────────────── */

export function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

/* ─── MonoText ───────────────────────────────────────────── */

export function MonoText({ children }: { children: string }) {
  return <Text style={styles.mono}>{children}</Text>;
}

/* ─── Divider ────────────────────────────────────────────── */

export function Divider() {
  return <View style={styles.divider} />;
}

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  // Button
  button: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFilled: {
    backgroundColor: theme.colors.gold,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  buttonTextFilled: { color: theme.colors.bg },
  buttonTextOutline: { color: theme.colors.gold },

  // Card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },

  // SectionHeader
  sectionHeader: {
    color: theme.colors.gold,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },

  // Mono
  mono: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontFamily: 'JetBrainsMono-Regular',
  },

  // Divider
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
});
