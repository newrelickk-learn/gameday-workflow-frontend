interface RageClickEntry {
  ok: true;
  verifiedAt: number;
}

const TTL_MS = 2 * 60 * 60 * 1000;

function getStore(): Map<string, RageClickEntry> {
  const g = globalThis as unknown as { __rageClickStore?: Map<string, RageClickEntry> };
  if (!g.__rageClickStore) {
    g.__rageClickStore = new Map<string, RageClickEntry>();
  }
  return g.__rageClickStore;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const rageClickStore = {
  markVerified(email: string): void {
    getStore().set(normalizeEmail(email), { ok: true, verifiedAt: Date.now() });
  },

  get(email: string): RageClickEntry | undefined {
    const key = normalizeEmail(email);
    const entry = getStore().get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() - entry.verifiedAt > TTL_MS) {
      getStore().delete(key);
      return undefined;
    }
    return entry;
  },
};
