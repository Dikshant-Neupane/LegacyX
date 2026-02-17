/**
 * ConnectScreen — Wallet connection landing for LegacyX mobile
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../providers/AuthProvider';
import { theme } from '../theme';

export function ConnectScreen() {
  const { connect, connecting } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Brand */}
        <View style={styles.brand}>
          <Text style={styles.logo}>LegacyX</Text>
          <Text style={styles.tagline}>
            Your digital legacy, sealed on Solana.
          </Text>
        </View>

        {/* Hero text */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Preserve What Matters</Text>
          <Text style={styles.heroBody}>
            Encrypt files, messages, and identity proofs. Set inheritance
            conditions and guardians. Everything lives on-chain — forever.
          </Text>
        </View>

        {/* Connect button */}
        <TouchableOpacity
          style={[styles.button, connecting && styles.buttonDisabled]}
          onPress={connect}
          disabled={connecting}
          activeOpacity={0.85}
        >
          {connecting ? (
            <ActivityIndicator color={theme.colors.bg} size="small" />
          ) : (
            <Text style={styles.buttonText}>Connect Wallet</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Requires a Solana-compatible mobile wallet
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  brand: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  logo: {
    fontFamily: 'PlayfairDisplay-Bold',
    fontSize: theme.fontSize.hero,
    color: theme.colors.gold,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  tagline: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
    letterSpacing: 1,
  },
  hero: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  heroTitle: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  heroBody: {
    fontSize: theme.fontSize.base,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    backgroundColor: theme.colors.gold,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: theme.radius.md,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.bg,
    fontSize: theme.fontSize.base,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  footnote: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.muted,
    marginTop: theme.spacing.md,
  },
});
