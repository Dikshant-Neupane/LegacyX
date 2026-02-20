// ============================================================================
// LEGACYX MVP API CLIENT — Simple HTTP client for auth and legacy management
// ============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  }

  // Auth
  async register(name: string, email: string, password: string) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  }

  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  // Legacy
  async getLegacies() {
    return this.request('/api/legacy');
  }

  async getLegacy(id: string) {
    return this.request(`/api/legacy/${id}`);
  }

  async createLegacy(data: {
    title: string;
    message: string;
    beneficiaries?: Array<{ name: string; email: string; relationship?: string }>;
    triggerDate?: string;
  }) {
    return this.request('/api/legacy', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLegacy(id: string, data: Partial<{
    title: string;
    message: string;
    beneficiaries: Array<{ name: string; email: string; relationship?: string }>;
    triggerDate: string;
    status: string;
  }>) {
    return this.request(`/api/legacy/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLegacy(id: string) {
    return this.request(`/api/legacy/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();

// ==========================================================================
// BACKWARDS COMPATIBILITY STUBS
// These exports exist only to prevent build errors in existing vault/identity
// pages. They are not functional in the MVP. Remove when cleaning up for v2.
// ==========================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const notImplemented = (..._args: any[]): Promise<any> => {
  return Promise.reject(new Error('This feature is not available in the MVP. Coming in v2.'));
};

export async function signAuthMessage(
  _signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  _action: string,
): Promise<{ signature: string; message: string }> {
  throw new Error('Wallet auth not available in MVP');
}

export const vaultApi = {
  create: notImplemented,
  checkIn: notImplemented,
  upload: notImplemented,
  addHeir: notImplemented,
  burnMessage: notImplemented,
  mintCertificate: notImplemented,
  get: notImplemented,
  getCertificate: notImplemented,
  getNotifications: notImplemented,
};

export const identityApi = {
  submitProof: notImplemented,
  getProof: notImplemented,
};

export const recoveryApi = {
  sign: notImplemented,
  getStatus: notImplemented,
};

export const whistleblowerApi = {
  configure: notImplemented,
};

export const explorerApi = {
  getLinks: notImplemented,
};
