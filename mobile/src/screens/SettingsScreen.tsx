/**
 * SettingsScreen — Guardian, heir management, and recovery for LegacyX mobile
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../providers/AuthProvider';
import { theme } from '../theme';

export function SettingsScreen() {
  const { publicKey, disconnect } = useAuth();

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect? You can reconnect any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: disconnect },
      ],
    );
  };

  const shortenKey = (key: string) => key.slice(0, 6) + '…' + key.slice(-6);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        {/* Wallet info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WALLET</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Connected Address</Text>
            <Text style={styles.mono}>{publicKey ? shortenKey(publicKey) : '—'}</Text>
          </View>
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              publicKey &&
              Linking.openURL(`https://solscan.io/account/${publicKey}?cluster=devnet`)
            }
          >
            <Text style={styles.linkText}>View on Solscan →</Text>
          </TouchableOpacity>
        </View>

        {/* Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VAULT MANAGEMENT</Text>
          <View style={styles.card}>
            <Text style={styles.muted}>
              Guardian management, heir updates, and advanced vault operations
              are available on the web app.
            </Text>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <View style={styles.card}>
            <Text style={styles.label}>LegacyX Mobile</Text>
            <Text style={styles.muted}>v0.1.0 (Devnet)</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.muted}>
              Your digital life vault, sealed on Solana. Files, messages, and
              identity proofs — encrypted and indestructible.
            </Text>
          </View>
        </View>

        {/* Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LINKS</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => Linking.openURL('https://legacyx.app')}
          >
            <Text style={styles.linkText}>Web App →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.card}
            onPress={() => Linking.openURL('https://docs.legacyx.app')}
          >
            <Text style={styles.linkText}>Documentation →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.card}
            onPress={() => Linking.openURL('https://github.com/legacyx')}
          >
            <Text style={styles.linkText}>GitHub →</Text>
          </TouchableOpacity>
        </View>

        {/* Disconnect */}
        <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
          <Text style={styles.disconnectText}>Disconnect Wallet</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: theme.spacing.lg, paddingBottom: 40 },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    marginBottom: theme.spacing.lg,
  },
  section: { marginBottom: theme.spacing.lg },
  sectionTitle: {
    color: theme.colors.gold,
    fontSize: theme.fontSize.xs,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: 6,
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginBottom: 4,
  },
  mono: {
    color: theme.colors.gold,
    fontSize: theme.fontSize.sm,
    fontFamily: 'JetBrainsMono-Regular',
  },
  muted: {
    color: theme.colors.muted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  linkText: {
    color: theme.colors.gold,
    fontSize: theme.fontSize.sm,
    letterSpacing: 0.5,
  },
  disconnectButton: {
    borderWidth: 1,
    borderColor: theme.colors.red,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  disconnectText: {
    color: theme.colors.red,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
