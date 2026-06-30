import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number;
  loading: boolean;
  error: string | null;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    loading: false,
    error: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }, []);

  const getCurrentLocation = useCallback(async () => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        if (mountedRef.current) {
          setLocation((prev) => ({
            ...prev,
            loading: false,
            error: 'Location permission denied',
          }));
        }
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (mountedRef.current) {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy || undefined,
          loading: false,
          error: null,
        });
      }
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch (err) {
      if (mountedRef.current) {
        setLocation((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to get location',
        }));
      }
      return null;
    }
  }, [requestPermission]);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  return { ...location, getCurrentLocation, requestPermission };
}
