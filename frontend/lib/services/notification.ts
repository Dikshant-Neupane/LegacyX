// ============================================================================
// NOTIFICATION SERVICE
// Handles alerts for vault status changes: warnings, triggers, releases.
// In production, integrate with email/SMS/push providers.
// For MVP, logs to console and stores in-memory for API polling.
// ============================================================================

export type NotificationType =
  | 'check_in_reminder'
  | 'vault_triggered'
  | 'vault_released'
  | 'guardian_sign_request'
  | 'whistleblower_broadcast'
  | 'heir_notification'
  | 'condition_satisfied';

export interface Notification {
  id: string;
  type: NotificationType;
  recipient: string; // pubkey
  vaultPubkey: string;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
  metadata?: Record<string, unknown>;
}

// In-memory notification store (replace with DB in production)
const notifications: Map<string, Notification[]> = new Map();

let notificationCounter = 0;

function generateId(): string {
  notificationCounter++;
  return `notif_${Date.now()}_${notificationCounter}`;
}

function addNotification(recipient: string, notification: Omit<Notification, 'id' | 'read' | 'createdAt'>): Notification {
  const full: Notification = {
    ...notification,
    id: generateId(),
    read: false,
    createdAt: Date.now(),
  };

  const existing = notifications.get(recipient) || [];
  existing.push(full);
  // Keep max 100 notifications per user
  if (existing.length > 100) {
    existing.shift();
  }
  notifications.set(recipient, existing);

  console.log(`[NOTIFICATION] ${full.type} → ${recipient.slice(0, 8)}...: ${full.title}`);
  return full;
}

export const notificationService = {
  /**
   * Notify vault owner about upcoming check-in deadline.
   */
  sendCheckInReminder(ownerPubkey: string, vaultPubkey: string, daysRemaining: number) {
    return addNotification(ownerPubkey, {
      type: 'check_in_reminder',
      recipient: ownerPubkey,
      vaultPubkey,
      title: `Check-in required in ${daysRemaining} days`,
      message: `Your vault check-in deadline is approaching. ${daysRemaining} days remaining before your vault enters triggered state.`,
      metadata: { daysRemaining },
    });
  },

  /**
   * Notify all heirs that a vault has been triggered.
   */
  notifyVaultTriggered(heirPubkeys: string[], vaultPubkey: string, ownerPubkey: string) {
    return heirPubkeys.map((heir) =>
      addNotification(heir, {
        type: 'vault_triggered',
        recipient: heir,
        vaultPubkey,
        title: 'Vault Triggered — 30 Day Grace Period',
        message: `A vault you are heir to has been triggered. The owner has 30 days to check in before assets are released.`,
        metadata: { ownerPubkey },
      }),
    );
  },

  /**
   * Notify heirs that the vault has been released.
   */
  notifyVaultReleased(heirPubkeys: string[], vaultPubkey: string) {
    return heirPubkeys.map((heir) =>
      addNotification(heir, {
        type: 'vault_released',
        recipient: heir,
        vaultPubkey,
        title: 'Vault Released — Assets Available',
        message: 'The vault grace period has expired. You can now access the encrypted contents and claim your inheritance.',
      }),
    );
  },

  /**
   * Request a guardian to sign for social recovery.
   */
  requestGuardianSign(guardianPubkey: string, vaultPubkey: string, proposedNewOwner: string) {
    return addNotification(guardianPubkey, {
      type: 'guardian_sign_request',
      recipient: guardianPubkey,
      vaultPubkey,
      title: 'Social Recovery — Signature Requested',
      message: `A social recovery has been initiated for a vault you guard. Please sign to approve ownership transfer.`,
      metadata: { proposedNewOwner },
    });
  },

  /**
   * Notify broadcast wallets about whistleblower event.
   */
  notifyWhistleblowerBroadcast(broadcastWallets: string[], vaultPubkey: string, cidCount: number) {
    return broadcastWallets.map((wallet) =>
      addNotification(wallet, {
        type: 'whistleblower_broadcast',
        recipient: wallet,
        vaultPubkey,
        title: 'Whistleblower Broadcast Received',
        message: `A dead-man's switch vault has broadcast ${cidCount} encrypted files to you. The vault owner may be compromised.`,
        metadata: { cidCount },
      }),
    );
  },

  /**
   * Notify heir about being added to a vault.
   */
  notifyHeirAdded(heirPubkey: string, vaultPubkey: string, ownerPubkey: string) {
    return addNotification(heirPubkey, {
      type: 'heir_notification',
      recipient: heirPubkey,
      vaultPubkey,
      title: 'You Have Been Added as an Heir',
      message: 'A vault owner has designated you as an heir. You will receive access to encrypted contents if the vault is released.',
      metadata: { ownerPubkey },
    });
  },

  /**
   * Notify heir that a condition has been satisfied.
   */
  notifyConditionSatisfied(heirPubkey: string, vaultPubkey: string, conditionLabel: string) {
    return addNotification(heirPubkey, {
      type: 'condition_satisfied',
      recipient: heirPubkey,
      vaultPubkey,
      title: `Condition Satisfied: ${conditionLabel}`,
      message: `Your condition "${conditionLabel}" has been verified on-chain. Associated assets are now unlocked.`,
      metadata: { conditionLabel },
    });
  },

  // --- Query ---

  getNotifications(recipientPubkey: string, unreadOnly = false): Notification[] {
    const all = notifications.get(recipientPubkey) || [];
    if (unreadOnly) {
      return all.filter((n) => !n.read);
    }
    return all;
  },

  markAsRead(recipientPubkey: string, notificationId: string): boolean {
    const all = notifications.get(recipientPubkey) || [];
    const notif = all.find((n) => n.id === notificationId);
    if (notif) {
      notif.read = true;
      return true;
    }
    return false;
  },

  getUnreadCount(recipientPubkey: string): number {
    return (notifications.get(recipientPubkey) || []).filter((n) => !n.read).length;
  },
};
