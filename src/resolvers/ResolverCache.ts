export interface ResolverCacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessAt: number;
}

export interface ResolverCacheOptions {
  maxEntries?: number;
  ttlMs?: number;
}

export class ResolverCache<T> {
  private readonly store = new Map<string, ResolverCacheEntry<T>>();
  private readonly inFlight = new Map<string, Promise<T>>();

  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(options: ResolverCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 500;
    this.ttlMs = options.ttlMs ?? 10 * 60_000;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (entry.expiresAt <= now) {
      this.store.delete(key);
      return null;
    }

    entry.lastAccessAt = now;
    return entry.value;
  }

  set(key: string, value: T): void {
    const now = Date.now();

    this.store.set(key, {
      value,
      expiresAt: now + this.ttlMs,
      lastAccessAt: now,
    });

    this.evictIfNeeded();
  }

  getInFlight(key: string): Promise<T> | null {
    return this.inFlight.get(key) ?? null;
  }

  setInFlight(key: string, promise: Promise<T>): void {
    this.inFlight.set(key, promise);

    promise
      .finally(() => {
        const current = this.inFlight.get(key);
        if (current === promise) {
          this.inFlight.delete(key);
        }
      })
      .catch(() => {
        // cleanup already handled in finally
      });
  }

  async getOrSet(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const existing = this.getInFlight(key);
    if (existing) {
      return existing;
    }

    const promise = factory().then((value) => {
      this.set(key, value);
      return value;
    });

    this.setInFlight(key, promise);
    return promise;
  }

  delete(key: string): void {
    this.store.delete(key);
    this.inFlight.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.inFlight.clear();
  }

  private evictIfNeeded(): void {
    if (this.store.size <= this.maxEntries) return;

    let oldestKey: string | null = null;
    let oldestAccess = Number.POSITIVE_INFINITY;

    for (const [key, entry] of this.store) {
      if (entry.lastAccessAt < oldestAccess) {
        oldestAccess = entry.lastAccessAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }
}
