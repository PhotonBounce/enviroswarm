import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Region } from 'react-native-maps';
import { useLocation } from '../hooks/useLocation';
import { apiClient } from '../api/client';
import { SensorStation, ApiResponse } from '../types';
import { StationMarker } from '../components/StationMarker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

export default function HomeScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  const { latitude, longitude, loading: locLoading, error: locError, getCurrentLocation } = useLocation();
  const [stations, setStations] = useState<SensorStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState<Region>({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const fetchNearby = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ lat: String(lat), lon: String(lon), radius_km: '10' });
      const res = await apiClient.get<ApiResponse<SensorStation[]>>(
        `/data/nearby?${params.toString()}`
      );
      if (res.data?.success) {
        setStations(res.data.data || []);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to fetch nearby stations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      fetchNearby(latitude, longitude);
    }
  }, [latitude, longitude]);

  const handleRefresh = async () => {
    await getCurrentLocation();
  };

  if (locLoading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.statusText}>Getting location...</Text>
      </SafeAreaView>
    );
  }

  if (locError) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <Text style={styles.errorText}>{locError}</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
          <Text style={styles.refreshBtnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MapView
        style={{ width, height }}
        region={region}
        onRegionChangeComplete={(newRegion) => { setRegion(newRegion); fetchNearby(newRegion.latitude, newRegion.longitude); }}
        showsUserLocation
        showsMyLocationButton
      >
        {stations.map((s) => (
          <StationMarker
            key={s.id}
            station={s}
            onPress={() => navigation.navigate('DataView', { stationId: s.id, stationName: s.name })}
          />
        ))}
      </MapView>

      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>Nearby Stations</Text>
        <Text style={styles.overlayCount}>{stations.length} found</Text>
        {loading && <ActivityIndicator size="small" color="#10b981" style={{ marginTop: 4 }} />}
        <TouchableOpacity style={styles.refreshBtnSmall} onPress={handleRefresh}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginBottom: 12,
  },
  refreshBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  refreshBtnText: {
    color: '#020617',
    fontWeight: '700',
    fontSize: 14,
  },
  overlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  overlayTitle: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '700',
  },
  overlayCount: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  refreshBtnSmall: {
    marginTop: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
});
