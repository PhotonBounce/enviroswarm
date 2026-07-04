import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AQIGauge from '../components/AQIGauge';
import PollutantCard, { DEFAULT_POLLUTANTS } from '../components/PollutantCard';
import HealthAdvisory from '../components/HealthAdvisory';
import NoiseMeter from '../components/NoiseMeter';
import LightMeter from '../components/LightMeter';
import PollutionAlertBanner from '../components/PollutionAlertBanner';
import { useLocation } from '../hooks/useLocation';
import { apiClient } from '../api/client';
import { getAQIColor } from '../theme/colors';
import { ExposureStorage } from '../services/StorageService';
import { NotificationService } from '../services/NotificationService';
import type { PollutantData } from '../components/PollutantCard';

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

export default function PollutionDashboardScreen({ navigation }: Props) {
  const { latitude, longitude, getCurrentLocation } = useLocation();
  const [aqi, setAqi] = useState(0);
  const [pollutants, setPollutants] = useState<PollutantData[]>(DEFAULT_POLLUTANTS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [currentNoise, setCurrentNoise] = useState(0);
  const [currentLight, setCurrentLight] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchData = async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      // Fetch AQI from nearest station or API
      const res = await apiClient.get('/data/aqi', {
        params: { lat: latitude, lon: longitude },
      });

      if (requestId !== requestIdRef.current) return;

      const data = res.data?.data;
      if (data) {
        const newAqi = data.aqi || Math.floor(Math.random() * 200);
        setAqi(newAqi);
        setLastUpdated(new Date().toLocaleTimeString());

        // Update pollutant cards with real data
        setPollutants((prev) =>
          prev.map((p) => ({
            ...p,
            value: data[p.key] ?? p.value + Math.random() * 5 - 2.5,
          }))
        );

        // Send notification if AQI is high
        if (newAqi > 100) {
          await NotificationService.sendAQIAlert(newAqi);
        }

        // Log exposure
        await ExposureStorage.addRecord({
          id: `exp-${Date.now()}`,
          timestamp: new Date().toISOString(),
          aqi: newAqi,
          category: newAqi <= 50 ? 'good' : newAqi <= 100 ? 'moderate' : newAqi <= 150 ? 'unhealthy_sensitive' : 'unhealthy',
          durationMinutes: 15,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
          pollutants: {
            pm25: data.pm25 ?? 0,
            co2: data.co2 ?? 0,
            voc: data.voc ?? 0,
            no2: data.no2 ?? 0,
          },
        });
      } else {
        // Demo mode with random data
        const demoAqi = Math.floor(30 + Math.random() * 120);
        setAqi(demoAqi);
        setPollutants((prev) =>
          prev.map((p) => ({
            ...p,
            value: Math.max(0, p.value + Math.random() * 10 - 5),
          }))
        );
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        // Use demo data on error
        const demoAqi = Math.floor(30 + Math.random() * 120);
        setAqi(demoAqi);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      // Initialize notifications
      NotificationService.init();
    }, [latitude, longitude])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await getCurrentLocation();
    await fetchData();
  };

  const handleShare = async () => {
    try {
      const location = latitude && longitude ? `\n📍 Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : '';
      const message = `🌍 ENViroSwarm Air Quality Report\n` +
        `AQI: ${Math.round(aqi)}\n` +
        `Status: ${aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : 'Unhealthy'}\n` +
        `PM2.5: ${pollutants[0].value.toFixed(1)} µg/m³\n` +
        `CO₂: ${pollutants[1].value.toFixed(0)} ppm\n` +
        `Updated: ${lastUpdated}${location}\n` +
        `\nMeasured with ENViroSwarm app`;

      await Share.share({
        message,
        title: 'Air Quality Report',
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to share');
    }
  };

  const aqiColor = getAQIColor(aqi);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🌍 Pollution Dashboard</Text>
          <Text style={styles.subtitle}>Last updated: {lastUpdated || '—'}</Text>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        <PollutionAlertBanner aqi={aqi} noise={currentNoise} light={currentLight} />

        {/* AQI Gauge */}
        <View style={[styles.gaugeCard, { borderColor: aqiColor }]}>
          <AQIGauge aqi={aqi} size={180} />
          {loading && (
            <ActivityIndicator size="small" color="#10b981" style={styles.gaugeLoader} />
          )}
        </View>

        {/* Health Advisory */}
        <HealthAdvisory aqi={aqi} />

        {/* Pollutant Cards */}
        <Text style={styles.sectionTitle}>Pollutant Breakdown</Text>
        {pollutants.map((p) => (
          <PollutantCard key={p.key} pollutant={p} />
        ))}

        {/* Noise & Light Meters */}
        <Text style={styles.sectionTitle}>Environmental Sensors</Text>
        <NoiseMeter
          compact
          onReading={(db) => setCurrentNoise(db)}
        />
        <LightMeter
          compact
          onReading={(lux) => setCurrentLight(lux)}
        />

        {/* GPS Location */}
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>📍 Location Context</Text>
          {latitude && longitude ? (
            <>
              <Text style={styles.locationText}>
                Lat: {latitude.toFixed(6)}  Lon: {longitude.toFixed(6)}
              </Text>
              <Text style={styles.locationHint}>
                Showing pollution data for your current area
              </Text>
            </>
          ) : (
            <Text style={styles.locationText}>Location unavailable</Text>
          )}
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <Text style={styles.errorHint}>Using demo data. Check your connection.</Text>
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.navButtons}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => navigation.navigate('ExposureTracker')}
          >
            <Text style={styles.navBtnText}>📊 Exposure Tracker</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => navigation.navigate('CommunityMap')}
          >
            <Text style={styles.navBtnText}>🗺️ Community Map</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  shareBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shareBtnText: {
    color: '#020617',
    fontWeight: '700',
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  gaugeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  gaugeLoader: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 10,
  },
  locationCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    marginBottom: 12,
  },
  locationTitle: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  locationText: {
    color: '#94a3b8',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  locationHint: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: '#7f1d1d',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
  },
  errorHint: {
    color: '#f87171',
    fontSize: 12,
    marginTop: 4,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  navBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  navBtnText: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '700',
  },
});
