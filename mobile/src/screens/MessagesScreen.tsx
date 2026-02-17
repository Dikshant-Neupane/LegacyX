/**
 * MessagesScreen — Regret Vault message list for LegacyX mobile
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../providers/AuthProvider';
import { api } from '../services/api';
import { theme } from '../theme';

interface MessageEntry {
  cid: string;
  addedAt?: number;
}

function shortenCid(cid: string): string {
  return cid.slice(0, 6) + '…' + cid.slice(-6);
}

export function MessagesScreen() {
  const { publicKey } = useAuth();
  const [messages, setMessages] = useState<MessageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!publicKey) return;
    try {
      const data = await api.get<{ arweaveCids: string[] }>(`/vault?owner=${publicKey}`);
      setMessages(
        (data.arweaveCids || []).map((cid) => ({ cid })),
      );
    } catch (_) {
      setMessages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [publicKey]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMessages();
  };

  const handleBurn = (cid: string) => {
    Alert.alert(
      'Burn Message',
      'This will permanently remove the on-chain reference. The Arweave data will persist.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Burn',
          style: 'destructive',
          onPress: async () => {
            try {
              // Would need signMessage + signTransaction for on-chain burn
              Alert.alert('Info', 'On-chain burn requires transaction signing on the web app.');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: MessageEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cidLabel}>CID</Text>
        <TouchableOpacity onPress={() => handleBurn(item.cid)}>
          <Text style={styles.burnButton}>Burn</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.cidText}>{shortenCid(item.cid)}</Text>
      <Text style={styles.encrypted}>🔒 Encrypted — viewable only after release</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.muted}>Loading messages…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Regret Vault</Text>
        <Text style={styles.subtitle}>
          Encrypted messages for your heirs. Compose on the web.
        </Text>
      </View>

      {messages.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No Messages Yet</Text>
          <Text style={styles.muted}>
            Use the web app to compose encrypted messages for your heirs.
          </Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.cid}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.gold}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  headerBar: { padding: theme.spacing.lg, paddingBottom: 0 },
  title: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: '700' },
  subtitle: { color: theme.colors.muted, fontSize: theme.fontSize.sm, marginTop: 4 },
  emptyTitle: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '600', marginBottom: 8 },
  muted: { color: theme.colors.muted, fontSize: theme.fontSize.sm, textAlign: 'center' },
  list: { padding: theme.spacing.lg },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cidLabel: { color: theme.colors.muted, fontSize: theme.fontSize.xs, letterSpacing: 1, textTransform: 'uppercase' },
  burnButton: { color: theme.colors.red, fontSize: theme.fontSize.xs, fontWeight: '600', letterSpacing: 1 },
  cidText: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontFamily: 'JetBrainsMono-Regular', marginBottom: 6 },
  encrypted: { color: theme.colors.muted, fontSize: theme.fontSize.xs },
});
