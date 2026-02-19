// ============================================================================
// LEGACYX API CLIENT — Frontend HTTP client for API routes
// All requests go through this module for centralized error handling.
// ============================================================================

const API_BASE = '/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  details?: Array<{ field: string; message: string; code: string }>;
  [key: string]: unknown;
}

class ApiError extends Error {
  status: number;
  details?: Array<{ field: string; message: string; code: string }>;

  constructor(message: string, status: number, details?: Array<{ field: string; message: string; code: string }>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new ApiError(
      data.error || `Request failed with status ${response.status}`,
      response.status,
      data.details,
    );
  }

  return data as T;
}

// --- Sign a message with Phantom for auth ---
export async function signAuthMessage(
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  action: string,
): Promise<{ signature: string; message: string }> {
  const msg = `LegacyX ${action}\nTimestamp: ${Date.now()}`;
  const messageBytes = new TextEncoder().encode(msg);
  const signatureBytes = await signMessage(messageBytes);

  // Convert Uint8Array to base58 using simple encoding
  const signature = uint8ToBase58(signatureBytes);
  return { signature, message: msg };
}

// Simple base58 encoding (matching bs58 library output)
function uint8ToBase58(bytes: Uint8Array): string {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let num = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    num = num * BigInt(256) + BigInt(bytes[i]);
  }
  let encoded = '';
  while (num > BigInt(0)) {
    const remainder = num % BigInt(58);
    num = num / BigInt(58);
    encoded = ALPHABET[Number(remainder)] + encoded;
  }
  // Add leading '1' for each leading zero byte
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) encoded = '1' + encoded;
    else break;
  }
  return encoded;
}

// ==========================================================================
// VAULT ENDPOINTS
// ==========================================================================

export const vaultApi = {
  async create(params: {
    ownerPubkey: string;
    vaultName: string;
    checkInInterval: number;
    heirPubkeys: string[];
    guardianPubkeys: string[];
    recoveryThreshold: number;
    signature: string;
    message: string;
  }) {
    return request<{
      success: boolean;
      transaction: string;
      vaultPda: string;
      vault: { owner: string; name: string; checkInInterval: number; heirCount: number; guardianCount: number };
    }>('/vault/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async checkIn(params: { ownerPubkey: string; signature: string; message: string }) {
    return request<{
      success: boolean;
      transaction: string;
      checkInAt: string;
    }>('/vault/checkin', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async upload(params: {
    ownerPubkey: string;
    encryptedData: string;
    contentType: string;
    signature: string;
    message: string;
    encryptedKeyShard?: string;
  }) {
    return request<{
      success: boolean;
      transaction: string;
      arweaveCid: string;
      arweaveUrl: string;
    }>('/vault/upload', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async addHeir(params: {
    ownerPubkey: string;
    heirPubkey: string;
    signature: string;
    message: string;
  }) {
    return request<{ success: boolean; transaction: string }>('/vault/add-heir', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async burnMessage(params: {
    heirPubkey: string;
    vaultOwnerPubkey: string;
    cidToBurn: string;
    signature: string;
    message: string;
  }) {
    return request<{ success: boolean; transaction: string }>('/vault/burn', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async mintCertificate(params: { ownerPubkey: string; signature: string; message: string }) {
    return request<{
      success: boolean;
      transaction: string;
      certificatePda: string;
      links: { solscan: string; explorer: string };
    }>('/vault/mint-certificate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async get(pubkey: string) {
    return request<{
      success: boolean;
      vault: {
        pubkey: string;
        owner: string;
        vaultName: string;
        status: 'Active' | 'Triggered' | 'Released' | 'Burned';
        checkInInterval: number;
        lastCheckIn: number;
        triggeredAt: number;
        createdAt: number;
        heirPubkeys: string[];
        guardianPubkeys: string[];
        recoveryThreshold: number;
        arweaveCids: string[];
        encryptedKeyShards: string[];
        fileCount: number;
        heirCount: number;
        guardianCount: number;
        whistleblowerEnabled: boolean;
        certificateMint: string | null;
      };
      links: { solscan: string; explorer: string };
    }>(`/vault/${pubkey}`);
  },

  async getCertificate(pubkey: string) {
    return request<{
      success: boolean;
      certificate: {
        vaultPubkey: string;
        owner: string;
        mintAddress: string;
        createdAt: number;
        links: { solscan: string; explorer: string; certificate: { solscan: string; explorer: string } };
      };
    }>(`/vault/${pubkey}/certificate`);
  },

  async getNotifications(pubkey: string, unreadOnly = false) {
    return request<{
      success: boolean;
      notifications: Array<{
        id: string;
        type: string;
        title: string;
        message: string;
        createdAt: number;
        read: boolean;
      }>;
      unreadCount: number;
    }>(`/vault/${pubkey}/notifications?unread=${unreadOnly}`);
  },
};

// ==========================================================================
// IDENTITY ENDPOINTS
// ==========================================================================

export const identityApi = {
  async submitProof(params: {
    ownerPubkey: string;
    faceHash: string;
    voiceHash: string;
    signature: string;
    message: string;
  }) {
    return request<{
      success: boolean;
      transaction: string;
      identityPda: string;
      identityProof: { owner: string; faceHash: string; voiceHash: string };
      links: { solscan: string; explorer: string };
    }>('/identity/proof', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getProof(pubkey: string) {
    return request<{
      success: boolean;
      identityProof: {
        pda: string;
        owner: string;
        faceHash: string;
        voiceHash: string;
        provedAt: number;
        isActive: boolean;
      };
      links: { solscan: string; explorer: string };
    }>(`/identity/${pubkey}`);
  },
};

// ==========================================================================
// RECOVERY ENDPOINTS
// ==========================================================================

export const recoveryApi = {
  async sign(params: {
    vaultPubkey: string;
    proposedNewOwner: string;
    guardianPubkey: string;
    signature: string;
    message: string;
  }) {
    return request<{
      success: boolean;
      transaction: string;
      recovery: {
        vault: string;
        proposedNewOwner: string;
        signedBy: string;
        threshold: number;
        totalGuardians: number;
      };
    }>('/recovery/sign', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getStatus(vaultPubkey: string) {
    return request<{
      success: boolean;
      recovery: {
        vault: string;
        guardianCount: number;
        threshold: number;
        guardians: string[];
      };
    }>(`/recovery/${vaultPubkey}/status`);
  },
};

// ==========================================================================
// WHISTLEBLOWER ENDPOINTS
// ==========================================================================

export const whistleblowerApi = {
  async configure(params: {
    ownerPubkey: string;
    vaultPubkey: string;
    broadcastWallets: string[];
    signature: string;
    message: string;
  }) {
    return request<{
      success: boolean;
      transaction: string;
      whistleblower: { vault: string; walletCount: number; configured: boolean };
    }>('/whistleblower/configure', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};

// ==========================================================================
// EXPLORER ENDPOINTS
// ==========================================================================

export const explorerApi = {
  async getLinks(txid: string) {
    return request<{
      success: boolean;
      links: { solscan: string; explorer: string; orb: string };
    }>(`/explorer/${txid}`);
  },
};
