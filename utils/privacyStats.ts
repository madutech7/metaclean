import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PrivacyStats {
  filesCleaned: number;
  gpsTracesRemoved: number;
  deviceTracesRemoved: number;
  totalSizeCleanedMB: number;
  lastCleanedDate: string | null;
}

const STATS_KEY = '@metaclean_stats_v2';

const INITIAL_STATS: PrivacyStats = {
  filesCleaned: 0,
  gpsTracesRemoved: 0,
  deviceTracesRemoved: 0,
  totalSizeCleanedMB: 0,
  lastCleanedDate: null,
};

export const getPrivacyStats = async (): Promise<PrivacyStats> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STATS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : INITIAL_STATS;
  } catch (e) {
    return INITIAL_STATS;
  }
};

export const updatePrivacyStats = async (update: Partial<PrivacyStats>) => {
  try {
    const current = await getPrivacyStats();
    const updated = {
      ...current,
      ...update,
      filesCleaned: current.filesCleaned + (update.filesCleaned || 0),
      gpsTracesRemoved: current.gpsTracesRemoved + (update.gpsTracesRemoved || 0),
      deviceTracesRemoved: current.deviceTracesRemoved + (update.deviceTracesRemoved || 0),
      totalSizeCleanedMB: current.totalSizeCleanedMB + (update.totalSizeCleanedMB || 0),
      lastCleanedDate: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to update stats', e);
  }
};
