import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

export interface LocationState {
  latitude: number;
  longitude: number;
  accuracy?: number;
  loading: boolean;
  error: string | null;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationState>({
    latitude: 0,
    longitude: 0,
    loading: false,
    error: null,
  });

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }, []);

  const getCurrentLocation = useCallback(async () => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setLocation((prev) => ({
          ...prev,
          loading: false,
          error: 'Location permission denied',
        }));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy || undefined,
        loading: false,
        error: null,
      });
    } catch (err) {
      setLocation((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to get location',
      }));
    }
  }, [requestPermission]);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  return { ...location, getCurrentLocation, requestPermission };
}
