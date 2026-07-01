import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { apiClient } from '../api/client';
import type { SensorReading, ApiResponse, SensorType } from '../types';
import { SENSOR_UNITS } from '../types';
import { SensorCard } from '../components/SensorCard';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  DataView: { stationId: string; stationName: string };
};

interface Props {
  route: RouteProp<RootStackParamList, 'DataView'>;
  navigation: NativeStackNavigationProp<RootStackParamList, 'DataView'>;
}

export default function DataViewScreen({ route }: Props) {
  const params = route.params;
  const { stationId, stationName } = params || {};
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(false);
  const sensorType = 'all';
  const isMounted = useRef(true);
  const { width } = useWindowDimensions();
  const screenWidth = width - 32;

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const searchParams = new URLSearchParams({ station_id: stationId, limit: '100' });
      if (sensorType !== 'all') {
        searchParams.append('sensor_type', sensorType);
      }
      const res = await apiClient.get<ApiResponse<SensorReading[]>>(`/data?${searchParams.toString()}`);
      if (res.data?.success) {
        if (isMounted.current) setReadings(res.data.data || []);
      }
    } catch (err: unknown) {
      if (isMounted.current) Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [stationId, sensorType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groupedByType = useMemo(() => {
    const groups: Record<string, SensorReading[]> = {};
    for (const r of readings) {
      if (!groups[r.sensor_type]) groups[r.sensor_type] = [];
      groups[r.sensor_type].push(r);
    }
    return groups;
  }, [readings]);

  const chartData = useMemo(() => {
    const fn = (type: SensorType) => {
      const items = groupedByType[type]?.slice(-20) || [];
      if (items.length < 2) return null;
      const validItems = items.filter(r => Number.isFinite(r.value));
      return {
        labels: validItems.map((r) => new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
        datasets: [
          {
            data: validItems.map((r) => r.value),
            color: () => '#10b981',
            strokeWidth: 2,
          },
        ],
        legend: [type.replace(/_/g, ' ')],
      };
    };
    return fn;
  }, [groupedByType]);

  const chartConfig = useMemo(() => ({
    backgroundColor: '#1e293b',
    backgroundGradientFrom: '#1e293b',
    backgroundGradientTo: '#1e293b',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    style: {
      borderRadius: 12,
    },
    propsForDots: {
      r: '3',
      strokeWidth: '2',
      stroke: '#10b981',
    },
  }), []);

  const types = Object.keys(groupedByType) as SensorType[];

  if (!stationId || !stationName) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.errorText}>Invalid navigation parameters</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>{stationName}</Text>
        <Text style={styles.subtitle}>Data View</Text>

        {loading && <ActivityIndicator size="large" color="#10b981" style={{ marginVertical: 20 }} />}

        {!loading && readings.length === 0 && (
          <Text style={styles.emptyText}>No readings yet for this station.</Text>
        )}

        {types.map((type) => {
          const data = chartData(type);
          if (!data) return null;
          return (
            <View key={type} style={styles.chartWrapper}>
              <Text style={styles.chartTitle}>
                {type.replace(/_/g, ' ').toUpperCase()} ({SENSOR_UNITS[type]})
              </Text>
              <LineChart
                data={data}
                width={screenWidth}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>Recent Readings</Text>
        {readings.slice(0, 20).map((r) => (
          <SensorCard key={r.id} reading={r} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  title: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 12,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 20,
  },
  chartWrapper: {
    marginBottom: 16,
  },
  chartTitle: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  chart: {
    borderRadius: 12,
  },
  sectionTitle: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  },
});
