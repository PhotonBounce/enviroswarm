import * as SecureStore from 'expo-secure-store';

const PREFIX = 'enviroswarm_';

// In-memory cache for performance + SecureStore for persistence
const memoryCache: Map<string, string> = new Map();

export class StorageService {
  static async set<T>(key: string, value: T): Promise<void> {
    try {
      const json = JSON.stringify(value);
      memoryCache.set(`${PREFIX}${key}`, json);
      await SecureStore.setItemAsync(`${PREFIX}${key}`, json);
    } catch (e) {
      console.error('Storage set error:', e);
    }
  }

  static async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    try {
      const cacheKey = `${PREFIX}${key}`;
      let raw = memoryCache.get(cacheKey);
      if (raw === undefined) {
        raw = await SecureStore.getItemAsync(cacheKey) ?? undefined;
        if (raw) memoryCache.set(cacheKey, raw);
      }
      if (raw === undefined) return defaultValue;
      return JSON.parse(raw) as T;
    } catch (e) {
      console.error('Storage get error:', e);
      return defaultValue;
    }
  }

  static async remove(key: string): Promise<void> {
    try {
      memoryCache.delete(`${PREFIX}${key}`);
      await SecureStore.deleteItemAsync(`${PREFIX}${key}`);
    } catch (e) {
      console.error('Storage remove error:', e);
    }
  }

  static async clear(): Promise<void> {
    try {
      // SecureStore doesn't have getAllKeys, so we just clear known keys
      const knownKeys = [
        'exposure_records', 'noise_records', 'light_records', 'alert_history', 'thresholds'
      ];
      for (const key of knownKeys) {
        await this.remove(key);
      }
      memoryCache.clear();
    } catch (e) {
      console.error('Storage clear error:', e);
    }
  }

  static async getKeys(): Promise<string[]> {
    return ['exposure_records', 'noise_records', 'light_records', 'alert_history', 'thresholds'];
  }
}

// Exposure data types
export interface ExposureRecord {
  id: string;
  timestamp: string;
  aqi: number;
  category: string;
  durationMinutes: number;
  latitude?: number;
  longitude?: number;
  pollutants: Record<string, number>;
}

export interface NoiseLogRecord {
  id: string;
  timestamp: string;
  dbLevel: number;
  latitude?: number;
  longitude?: number;
  durationSeconds: number;
}

export interface LightLogRecord {
  id: string;
  timestamp: string;
  lux: number;
  latitude?: number;
  longitude?: number;
}

export interface AlertRecord {
  id: string;
  timestamp: string;
  type: 'aqi' | 'noise' | 'light' | 'general';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  acknowledged: boolean;
}

// Specialized storage helpers
export const ExposureStorage = {
  async addRecord(record: ExposureRecord): Promise<void> {
    const existing = (await StorageService.get<ExposureRecord[]>('exposure_records', [])) || [];
    existing.push(record);
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const filtered = existing.filter((r) => new Date(r.timestamp).getTime() > cutoff);
    await StorageService.set('exposure_records', filtered.slice(-500)); // Keep last 500 records
  },

  async getRecords(): Promise<ExposureRecord[]> {
    return (await StorageService.get<ExposureRecord[]>('exposure_records', [])) || [];
  },

  async clear(): Promise<void> {
    await StorageService.remove('exposure_records');
  },
};

export const NoiseStorage = {
  async addRecord(record: NoiseLogRecord): Promise<void> {
    const existing = (await StorageService.get<NoiseLogRecord[]>('noise_records', [])) || [];
    existing.push(record);
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filtered = existing.filter((r) => new Date(r.timestamp).getTime() > cutoff);
    await StorageService.set('noise_records', filtered.slice(-300));
  },

  async getRecords(): Promise<NoiseLogRecord[]> {
    return (await StorageService.get<NoiseLogRecord[]>('noise_records', [])) || [];
  },
};

export const LightStorage = {
  async addRecord(record: LightLogRecord): Promise<void> {
    const existing = (await StorageService.get<LightLogRecord[]>('light_records', [])) || [];
    existing.push(record);
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filtered = existing.filter((r) => new Date(r.timestamp).getTime() > cutoff);
    await StorageService.set('light_records', filtered.slice(-300));
  },

  async getRecords(): Promise<LightLogRecord[]> {
    return (await StorageService.get<LightLogRecord[]>('light_records', [])) || [];
  },
};

export const AlertStorage = {
  async addAlert(alert: AlertRecord): Promise<void> {
    const existing = (await StorageService.get<AlertRecord[]>('alert_history', [])) || [];
    existing.unshift(alert);
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filtered = existing.filter((a) => new Date(a.timestamp).getTime() > cutoff);
    await StorageService.set('alert_history', filtered.slice(0, 200));
  },

  async getAlerts(): Promise<AlertRecord[]> {
    return (await StorageService.get<AlertRecord[]>('alert_history', [])) || [];
  },

  async acknowledgeAlert(id: string): Promise<void> {
    const existing = (await StorageService.get<AlertRecord[]>('alert_history', [])) || [];
    const updated = existing.map((a) => (a.id === id ? { ...a, acknowledged: true } : a));
    await StorageService.set('alert_history', updated);
  },

  async clear(): Promise<void> {
    await StorageService.remove('alert_history');
  },
};

export const ThresholdStorage = {
  DEFAULTS: {
    aqiWarning: 100,
    aqiCritical: 150,
    noiseWarning: 70,
    noiseCritical: 85,
    lightWarning: 1000,
    lightCritical: 2000,
  },

  async getThresholds(): Promise<{ aqiWarning: number; aqiCritical: number; noiseWarning: number; noiseCritical: number; lightWarning: number; lightCritical: number }> {
    return (await StorageService.get('thresholds', this.DEFAULTS)) || this.DEFAULTS;
  },

  async setThresholds(thresholds: Partial<{ aqiWarning: number; aqiCritical: number; noiseWarning: number; noiseCritical: number; lightWarning: number; lightCritical: number }>): Promise<void> {
    const current = await this.getThresholds();
    await StorageService.set('thresholds', { ...current, ...thresholds });
  },
};
