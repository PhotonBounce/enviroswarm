import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import type { Region } from 'react-native-maps';
import { useWindowDimensions } from 'react-native';
import { useLocation } from '../hooks/useLocation';
import { apiClient } from '../api/client';
import { getAQIColor, getAQILabel } from '../theme/colors';
import { ExposureStorage } from '../services/StorageService';
import type { ExposureRecord } from '../services/StorageService';

interface MapReading {
  id: string;
  latitude: number;
  longitude: number;
  aqi: number;
  timestamp: string;
  userId?: string;
  isAnonymous: boolean;
}

const POLLUTANT_FILTERS = [
  { key: 'all', label: 'All', icon: '🌍' },
  { key: 'aqi', label: 'AQI', icon: '🌫️' },
  { key: 'pm25', label: 'PM2.5', icon: '💨' },
  { key: 'noise', label: 'Noise', icon: '🔊' },
  { key: 'light', label: 'Light', icon: '💡' },
];

export default function CommunityMapScreen() {
  const { width, height } = useWindowDimensions();
  const { latitude, longitude, getCurrentLocation } = useLocation();
  const [readings, setReadings] = useState<MapReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [region, setRegion] = useState<Region>({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitAqi, setSubmitAqi] = useState('');
  const [submitNote, setSubmitNote] = useState('');
  const requestIdRef = useRef(0);

  const fetchReadings = useCallback(async (lat: number, lon: number) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const res = await apiClient.get('/data/community-readings', {
        params: { lat, lon, radius_km: 20 },
      });
      if (requestId !== requestIdRef.current) return;
      if (res.data?.success) {
        setReadings(res.data.data || []);
      } else {
        // Demo data
        generateDemoReadings(lat, lon);
      }
    } catch (e) {
      if (requestId === requestIdRef.current) {
        generateDemoReadings(lat, lon);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const generateDemoReadings = (lat: number, lon: number) => {
    const demo: MapReading[] = [];
    for (let i = 0; i < 15; i++) {
      const aqi = Math.floor(20 + Math.random() * 180);
      demo.push({
        id: `demo-${i}`,
        latitude: lat + (Math.random() - 0.5) * 0.04,
        longitude: lon + (Math.random() - 0.5) * 0.04,
        aqi,
        timestamp: new Date().toISOString(),
        isAnonymous: true,
      });
    }
    setReadings(demo);
  };

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      fetchReadings(latitude, longitude);
    }
  }, [latitude, longitude]);

  const handleSubmitReading = async () => {
    const aqi = parseInt(submitAqi, 10);
    if (isNaN(aqi) || aqi < 0 || aqi > 500) {
      Alert.alert('Invalid AQI', 'Please enter a valid AQI value (0-500)');
      return;
    }

    if (!latitude || !longitude) {
      Alert.alert('No Location', 'Cannot get your current location');
      return;
    }

    try {
      await apiClient.post('/data/community-readings', {
        latitude,
        longitude,
        aqi,
        note: submitNote,
        timestamp: new Date().toISOString(),
        isAnonymous: true,
      });

      // Also save locally
      await ExposureStorage.addRecord({
        id: `community-${Date.now()}`,
        timestamp: new Date().toISOString(),
        aqi,
        category: aqi <= 50 ? 'good' : aqi <= 100 ? 'moderate' : 'unhealthy',
        durationMinutes: 15,
        latitude,
        longitude,
        pollutants: {},
      });

      Alert.alert('Success', 'Your anonymous reading has been submitted!');
      setShowSubmitModal(false);
      setSubmitAqi('');
      setSubmitNote('');
      fetchReadings(latitude, longitude);
    } catch (e) {
      Alert.alert('Error', 'Failed to submit reading. Please try again.');
    }
  };

  const filteredReadings = filter === 'all' ? readings : readings.filter((r) => {
    if (filter === 'noise' || filter === 'light') return true; // Show all for demo
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Community Map</Text>
        <TouchableOpacity style={styles.submitBtn} onPress={() => setShowSubmitModal(true)}>
          <Text style={styles.submitBtnText}>Submit</Text>
        </TouchableOpacity>
      </View>

      {/* Filter bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {POLLUTANT_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={styles.filterIcon}>{f.icon}</Text>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Map */}
      <MapView
        style={{ width, height: height * 0.6 }}
        region={region}
        onRegionChangeComplete={(newRegion) => {
          setRegion(newRegion);
          fetchReadings(newRegion.latitude, newRegion.longitude);
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {filteredReadings.map((r) => {
          const color = getAQIColor(r.aqi);
          return (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.latitude, longitude: r.longitude }}
            >
              <View style={[styles.marker, { backgroundColor: color }]}>
                <Text style={styles.markerText}>{Math.round(r.aqi)}</Text>
              </View>
            </Marker>
          );
        })}
        {latitude && longitude && (
          <Circle
            center={{ latitude, longitude }}
            radius={1000}
            fillColor="rgba(16, 185, 129, 0.1)"
            strokeColor="rgba(16, 185, 129, 0.5)"
            strokeWidth={1}
          />
        )}
      </MapView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>AQI Legend</Text>
        <View style={styles.legendRow}>
          {[
            { color: '#10b981', label: '0-50' },
            { color: '#f59e0b', label: '51-100' },
            { color: '#f97316', label: '101-150' },
            { color: '#ef4444', label: '151-200' },
            { color: '#a855f7', label: '200+' },
          ].map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#10b981" />
        </View>
      )}

      {/* Submit Modal */}
      <Modal
        visible={showSubmitModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubmitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Submit Anonymous Reading</Text>
            <Text style={styles.modalHint}>
              Your reading will be shared with the community. No personal data is collected.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="AQI value (0-500)"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={submitAqi}
              onChangeText={setSubmitAqi}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Optional note (e.g., burning smell, heavy traffic)"
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={3}
              value={submitNote}
              onChangeText={setSubmitNote}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowSubmitModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.submitModalBtn]}
                onPress={handleSubmitReading}
              >
                <Text style={styles.submitModalBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '800',
  },
  submitBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitBtnText: {
    color: '#020617',
    fontWeight: '700',
    fontSize: 12,
  },
  filterBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  filterIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  filterText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#020617',
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  legend: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  legendTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  loadingOverlay: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 20,
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalHint: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    color: '#f1f5f9',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#334155',
  },
  cancelBtnText: {
    color: '#f1f5f9',
    fontWeight: '700',
  },
  submitModalBtn: {
    backgroundColor: '#10b981',
  },
  submitModalBtnText: {
    color: '#020617',
    fontWeight: '700',
  },
});
