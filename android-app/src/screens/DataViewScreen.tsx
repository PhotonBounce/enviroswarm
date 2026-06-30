import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { apiClient } from '../api/client';
import { SensorReading, ApiResponse, SensorType, SENSOR_UNITS } from '../types';
import { SensorCard } from '../components/SensorCard';
import { RouteProp } from '@react-navigation/native';

interface Props {
  route: RouteProp<any>;
}

const screenWidth = Dimensions.get('window').width - 32;

export default function DataViewScreen({ route }: Props) {
  const { stationId, stationName } = route.params as { stationId: string; stationName: string };
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [sensorType, setSensorType] = useState<SensorType | 'all'>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = `/data?station_id=${stationId}&limit=100${sensorType !== 'all' ? `&sensor_type=${sensorType}` : ''}`;
      const res = await apiClient.get<ApiResponse<SensorReading[]>>(url);
      if (res.data.success) {
        setReadings(res.data.data || []);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [stationId, sensorType]);

  const groupedByType: Record<string, SensorReading[]> = {};
  for (const r of readings) {
    if (!groupedByType[r.sensor_type]) groupedByType[r.sensor_type] = [];
    groupedByType[r.sensor_type].push(r);
  }

  const chartData = (type: SensorType) => {
    const items = groupedByType[type]?.slice(-20) || [];
    if (items.length < 2) return null;
    return {
      labels: items.map((_, i) => String(i + 1)),
      datasets: [
        {
          data: items.map((r) => r.value),
          color: () => '#10b981',
          strokeWidth: 2,
        },
      ],
      legend: [type.replace('_', ' ')],
    };
  };

  const chartConfig = {
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
  };

  const types = Object.keys(groupedByType) as SensorType[];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
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
              {type.replace('_', ' ').toUpperCase()} ({SENSOR_UNITS[type]})
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
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
