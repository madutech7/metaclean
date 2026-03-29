import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PrivacyStats {
  cleanedItems: number;
  removedGPS: number;
}

const STATS_KEY = '@MetaClean_Stats';

export const getPrivacyStats = async (): Promise<PrivacyStats> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STATS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : { cleanedItems: 0, removedGPS: 0 };
  } catch (e) {
    return { cleanedItems: 0, removedGPS: 0 };
  }
};

export const updatePrivacyStats = async (itemsCount: number, gpsCount: number) => {
  try {
    const current = await getPrivacyStats();
    const newStats = {
      cleanedItems: current.cleanedItems + itemsCount,
      removedGPS: current.removedGPS + gpsCount,
    };
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats));
    return newStats;
  } catch (e) {
    console.error('Failed to save privacy stats', e);
    return { cleanedItems: 0, removedGPS: 0 };
  }
};
