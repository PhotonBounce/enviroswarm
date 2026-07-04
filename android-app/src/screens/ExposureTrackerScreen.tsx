import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { useWindowDimensions } from 'react-native';
import { ExposureStorage, type ExposureRecord } from '../services/StorageService';
import { getAQIColor } from '../theme/colors';

// Simple CSV export helper
function exportToCSV(records: ExposureRecord[]): string {
  const headers = ['timestamp', 'aqi', 'category', 'duration_minutes', 'latitude', 'longitude', 'pm25', 'co2', 'voc', 'no2'];
  const rows = records.map((r) => [
    r.timestamp,
    r.aqi,
    r.category,
    r.durationMinutes,
    r.latitude ?? '',
    r.longitude ?? '',
    r.pollutants?.pm25 ?? '',
    r.pollutants?.co2 ?? '',
    r.pollutants?.voc ?? '',
    r.pollutants?.no2 ?? '',
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export default function ExposureTrackerScreen() {
  const { width } = useWindowDimensions();
  const [records, setRecords] = useState<ExposureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week'>('day');
  const [healthScore, setHealthScore] = useState(100);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const all = await ExposureStorage.getRecords();
      const cutoff = Date.now() - (timeRange === 'day' ? 1 : 7) * 24 * 60 * 60 * 1000;
      const filtered = all.filter((r) => new Date(r.timestamp).getTime() > cutoff);
      setRecords(filtered);

      // Calculate health score
      if (filtered.length > 0) {
        const avgAqi = filtered.reduce((sum, r) => sum + r.aqi, 0) / filtered.length;
        const score = Math.max(0, 100 - Math.max(0, avgAqi - 50) * 0.5);
        setHealthScore(Math.round(score));
      } else {
        setHealthScore(100);
      }
    } catch (e) {
      console.error('Load records error:', e);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

  const getCategoryBreakdown = () => {
    const categories: Record<string, { count: number; minutes: number }> = {};
    for (const r of records) {
      const cat = r.category;
      if (!categories[cat]) categories[cat] = { count: 0, minutes: 0 };
      categories[cat].count += 1;
      categories[cat].minutes += r.durationMinutes;
    }
    return categories;
  };

  const getHourlyData = () => {
    const hours = Array(24).fill(0).map(() => ({ totalAqi: 0, count: 0 }));
    for (const r of records) {
      const h = new Date(r.timestamp).getHours();
      hours[h].totalAqi += r.aqi;
      hours[h].count += 1;
    }
    return hours.map((h) => (h.count > 0 ? h.totalAqi / h.count : 0));
  };

  const handleExport = async () => {
    try {
      const csv = exportToCSV(records);
      // In a real app, use expo-file-system and expo-sharing to save and share the CSV
      Alert.alert(
        'Export Ready',
        `CSV with ${records.length} records generated. In a production app, this would be saved to your device.`,
        [
          { text: 'OK' },
          {
            text: 'Copy to Clipboard',
            onPress: () => {
              // Clipboard.setString(csv); // Would need expo-clipboard
              Alert.alert('Copied!', 'CSV content copied to clipboard (simulated)');
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const breakdown = getCategoryBreakdown();
  const hourlyData = getHourlyData();
  const chartWidth = width - 48;
  const chartHeight = 200;

  const chartConfig = {
    backgroundColor: '#1e293b',
    backgroundGradientFrom: '#1e293b',
    backgroundGradientTo: '#1e293b',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    style: {
      borderRadius: 12,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#10b981',
    },
  };

  const aqiCategoryData = {
    labels: ['Good', 'Mod', 'Sens', 'Unhealthy', 'V. Unhealthy', 'Hazard'],
    datasets: [
      {
        data: [
          breakdown['good']?.minutes ?? 0,
          breakdown['moderate']?.minutes ?? 0,
          breakdown['unhealthy_sensitive']?.minutes ?? 0,
          breakdown['unhealthy']?.minutes ?? 0,
          breakdown['very_unhealthy']?.minutes ?? 0,
          breakdown['hazardous']?.minutes ?? 0,
        ],
        colors: [
          (opacity: number) => `rgba(16, 185, 129, ${opacity})`,
          (opacity: number) => `rgba(245, 158, 11, ${opacity})`,
          (opacity: number) => `rgba(249, 115, 22, ${opacity})`,
          (opacity: number) => `rgba(239, 68, 68, ${opacity})`,
          (opacity: number) => `rgba(168, 85, 247, ${opacity})`,
          (opacity: number) => `rgba(127, 29, 29, ${opacity})`,
        ],
      },
    ],
  };

  const lineData = {
    labels: ['00', '04', '08', '12', '16', '20'],
    datasets: [
      {
        data: [
          hourlyData.slice(0, 4).reduce((a, b) => a + b, 0) / 4,
          hourlyData.slice(4, 8).reduce((a, b) => a + b, 0) / 4,
          hourlyData.slice(8, 12).reduce((a, b) => a + b, 0) / 4,
          hourlyData.slice(12, 16).reduce((a, b) => a + b, 0) / 4,
          hourlyData.slice(16, 20).reduce((a, b) => a + b, 0) / 4,
          hourlyData.slice(20, 24).reduce((a, b) => a + b, 0) / 4,
        ],
      },
    ],
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Exposure Tracker</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Text style={styles.exportBtnText}>Export CSV</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rangeTabs}>
        <TouchableOpacity
          style={[styles.rangeTab, timeRange === 'day' && styles.rangeTabActive]}
          onPress={() => setTimeRange('day')}
        >
          <Text style={[styles.rangeTabText, timeRange === 'day' && styles.rangeTabTextActive]}>24h</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rangeTab, timeRange === 'week' && styles.rangeTabActive]}
          onPress={() => setTimeRange('week')}
        >
          <Text style={[styles.rangeTabText, timeRange === 'week' && styles.rangeTabTextActive]}>7 Days</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Health Score */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Health Impact Score</Text>
            <Text style={[styles.scoreValue, { color: getAQIColor(100 - healthScore) }]}>
              {healthScore}
            </Text>
            <Text style={styles.scoreHint}>
              {healthScore >= 90 ? 'Excellent' : healthScore >= 70 ? 'Good' : healthScore >= 50 ? 'Fair' : 'Poor'}
            </Text>
          </View>

          {/* AQI Category Breakdown */}
          <Text style={styles.sectionTitle}>Time by AQI Category</Text>
          {records.length > 0 ? (
            <BarChart
              data={aqiCategoryData}
              width={chartWidth}
              height={chartHeight}
              chartConfig={chartConfig}
              style={styles.chart}
              fromZero
              showBarTops={false}
              withInnerLines={false}
              yAxisLabel=""
              yAxisSuffix="m"
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>No data yet. Collect some readings!</Text>
            </View>
          )}

          {/* Hourly Trend */}
          <Text style={styles.sectionTitle}>AQI Trend</Text>
          {records.length > 0 ? (
            <LineChart
              data={lineData}
              width={chartWidth}
              height={chartHeight}
              chartConfig={chartConfig}
              style={styles.chart}
              bezier
              fromZero
              withInnerLines={false}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>No data yet. Collect some readings!</Text>
            </View>
          )}

          {/* Summary Stats */}
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{records.length}</Text>
              <Text style={styles.statLabel}>Readings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {records.length > 0
                  ? Math.round(records.reduce((s, r) => s + r.aqi, 0) / records.length)
                  : 0}
              </Text>
              <Text style={styles.statLabel}>Avg AQI</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {records.length > 0 ? Math.max(...records.map((r) => r.aqi)) : 0}
              </Text>
              <Text style={styles.statLabel}>Max AQI</Text>
            </View>
          </View>
        </ScrollView>
      )}
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
  exportBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  rangeTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  rangeTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rangeTabActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  rangeTabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  rangeTabTextActive: {
    color: '#020617',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '800',
    marginVertical: 8,
    fontVariant: ['tabular-nums'],
  },
  scoreHint: {
    color: '#64748b',
    fontSize: 13,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 10,
  },
  chart: {
    borderRadius: 12,
    marginVertical: 4,
  },
  emptyChart: {
    height: 200,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    color: '#f1f5f9',
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
});
