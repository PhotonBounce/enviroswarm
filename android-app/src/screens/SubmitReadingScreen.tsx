import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { apiClient } from '../api/client';
import { SensorStation, ApiResponse, SensorReading, SensorType, SENSOR_UNITS } from '../types';
import { useLocation } from '../hooks/useLocation';
import { ReadingForm } from '../components/ReadingForm';

export default function SubmitReadingScreen() {
  const [stations, setStations] = useState<SensorStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<SensorStation | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { latitude, longitude, getCurrentLocation } = useLocation();

  const fetchStations = async () => {
    setRefreshing(true);
    try {
      const res = await apiClient.get<ApiResponse<SensorStation[]>>('/stations');
      if (res.data?.success) {
        setStations(res.data.data || []);
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load stations');
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStations();
    }, [])
  );

  const handleSubmit = async (data: {
    station_id: string;
    sensor_type: SensorType;
    value: number;
    unit: string;
    lat?: number;
    lon?: number;
  }) => {
    setLoading(true);
    try {
      const payload = {
        station_id: data.station_id,
        sensor_type: data.sensor_type,
        value: data.value,
        unit: data.unit,
        timestamp: new Date().toISOString(),
        metadata: {
          ...(data.lat !== undefined && data.lat !== null ? { lat: data.lat } : {}),
          ...(data.lon !== undefined && data.lon !== null ? { lon: data.lon } : {}),
        },
      };
      const res = await apiClient.post<ApiResponse<SensorReading>>('/ingest', payload);
      if (res.data?.success) {
        Alert.alert('Success', 'Reading submitted successfully');
        setSelectedStation(null);
      } else {
        Alert.alert('Error', res.data?.error || 'Submission failed');
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedStation) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.title}>Select a Station</Text>
        <FlatList
          data={stations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchStations} tintColor="#10b981" />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelectedStation(item)}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>{item.sensor_types.join(', ')}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No stations. Create one from the Stations tab.</Text>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedStation(null)}>
        <Text style={styles.backBtnText}>← Back to stations</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Submit Reading</Text>
      <Text style={styles.subtitle}>{selectedStation.name}</Text>
      <ReadingForm
        stationId={selectedStation.id}
        initialLat={latitude ?? undefined}
        initialLon={longitude ?? undefined}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  title: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  cardTitle: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '700',
  },
  cardMeta: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backBtnText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
});
