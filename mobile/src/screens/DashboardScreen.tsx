/**
 * DashboardScreen — Vault overview for LegacyX mobile
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../providers/AuthProvider';
import { api, API_BASE } from '../services/api';
import { theme } from '../theme';

interface VaultInfo {
  pubkey: string;
  vaultName: string;
  status: number;
  checkInInterval: number;
  lastCheckIn: number;
  heirPubkeys: string[];
  guardianPubkeys: string[];
  arweaveCids: string[];
}

const STATUS_LABELS: Record<number, string> = {
  0: 'Active',
  1: 'Triggered',
  2: 'Released',
  3: 'Burned',
};

const STATUS_COLORS: Record<number, string> = {
  0: theme.colors.gold,
  1: theme.colors.amber,
  2: theme.colors.green,
  3: theme.colors.red,
};

function daysRemaining(lastCheckIn: number, interval: number): number {
  const deadlineMs = (lastCheckIn + interval) * 1000;
  const diff = deadlineMs - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

function shortenKey(key: string): string {
  return key.slice(0, 4) + '…' + key.slice(-4);
}

export function DashboardScreen() {
  const { publicKey } = useAuth();
  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVault = useCallback(async () => {
    if (!publicKey) return;
    try {
      setError(null);
      const data = await api.get<VaultInfo>(`/vault?owner=${publicKey}`);
      setVault(data);
    } catch (err: any) {
      if (err.message?.includes('404')) {
        setVault(null);
      } else {
        setError(err.message || 'Failed to load vault');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [publicKey]);

  useEffect(() => { fetchVault(); }, [fetchVault]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVault();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading vault…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!vault) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.heroTitle}>No Vault Found</Text>
          <Text style={styles.muted}>
            Create your vault on the web app to get started.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const days = daysRemaining(vault.lastCheckIn, vault.checkInInterval);
  const statusLabel = STATUS_LABELS[vault.status] || 'Unknown';
  const statusColor = STATUS_COLORS[vault.status] || theme.colors.muted;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.gold}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heroTitle}>{vault.vaultName || 'My Vault'}</Text>
          <View style={[styles.badge, { borderColor: statusColor }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Countdown */}
        {vault.status === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>NEXT CHECK-IN</Text>
            <Text style={styles.countdown}>{days}</Text>
            <Text style={styles.cardLabel}>DAYS REMAINING</Text>
          </View>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{vault.arweaveCids.length}</Text>
            <Text style={styles.statLabel}>Files</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{vault.heirPubkeys.length}</Text>
            <Text style={styles.statLabel}>Heirs</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{vault.guardianPubkeys.length}</Text>
            <Text style={styles.statLabel}>Guardians</Text>
          </View>
        </View>

        {/* Heirs */}
        {vault.heirPubkeys.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Heirs</Text>
            {vault.heirPubkeys.map((key, i) => (
              <TouchableOpacity
                key={i}
                style={styles.listItem}
                onPress={() =>
                  Linking.openURL(`https://solscan.io/account/${key}?cluster=devnet`)
                }
              >
                <Text style={styles.mono}>{shortenKey(key)}</Text>
                <Text style={styles.linkArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Arweave CIDs */}
        {vault.arweaveCids.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Encrypted Files</Text>
            {vault.arweaveCids.map((cid, i) => (
              <TouchableOpacity
                key={i}
                style={styles.listItem}
                onPress={() =>
                  Linking.openURL(`https://arweave.net/${cid}`)
                }
              >
                <Text style={styles.mono}>{shortenKey(cid)}</Text>
                <Text style={styles.linkArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Explorer */}
        <TouchableOpacity
          style={styles.explorerLink}
          onPress={() =>
            Linking.openURL(
              `https://solscan.io/account/${vault.pubkey}?cluster=devnet`
            )
          }
        >
          <Text style={styles.explorerText}>View on Solscan →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  scroll: { padding: theme.spacing.lg },
  loadingText: { color: theme.colors.muted, fontSize: theme.fontSize.base },
  heroTitle: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: '700', marginBottom: 4 },
  muted: { color: theme.colors.muted, fontSize: theme.fontSize.sm, textAlign: 'center', marginTop: 8 },
  errorText: { color: theme.colors.red, fontSize: theme.fontSize.sm, marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  badge: { borderWidth: 1, borderRadius: theme.radius.sm, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: theme.fontSize.xs, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  cardLabel: { color: theme.colors.muted, fontSize: theme.fontSize.xs, letterSpacing: 2, textTransform: 'uppercase' },
  countdown: { color: theme.colors.gold, fontSize: 64, fontWeight: '200', marginVertical: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: theme.spacing.lg },
  stat: { alignItems: 'center' },
  statValue: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: '700' },
  statLabel: { color: theme.colors.muted, fontSize: theme.fontSize.xs, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  section: { marginBottom: theme.spacing.lg },
  sectionTitle: { color: theme.colors.gold, fontSize: theme.fontSize.xs, letterSpacing: 2, textTransform: 'uppercase', marginBottom: theme.spacing.sm },
  listItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mono: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontFamily: 'JetBrainsMono-Regular' },
  linkArrow: { color: theme.colors.gold, fontSize: theme.fontSize.base },
  explorerLink: { alignItems: 'center', paddingVertical: theme.spacing.md },
  explorerText: { color: theme.colors.gold, fontSize: theme.fontSize.sm, letterSpacing: 1 },
});
