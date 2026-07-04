import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { POLLUTANT_COLORS } from '../theme/colors';

export interface PollutantData {
  name: string;
  key: string;
  value: number;
  unit: string;
  whoLimit: number;
  color: string;
}

interface PollutantCardProps {
  pollutant: PollutantData;
}

export default function PollutantCard({ pollutant }: PollutantCardProps) {
  const percentOfLimit = (pollutant.value / pollutant.whoLimit) * 100;
  const isExceeded = pollutant.value > pollutant.whoLimit;

  return (
    <View style={[styles.card, { borderLeftColor: pollutant.color }]}>
      <View style={styles.header}>
        <Text style={[styles.name, { color: pollutant.color }]}>{pollutant.name}</Text>
        <Text style={styles.value}>
          <Text style={styles.number}>{pollutant.value.toFixed(1)}</Text>
          <Text style={styles.unit}> {pollutant.unit}</Text>
        </Text>
      </View>

      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.min(percentOfLimit, 100)}%`,
                backgroundColor: pollutant.color,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.whoLimit}>
          WHO limit: {pollutant.whoLimit} {pollutant.unit}
        </Text>
        <Text style={[styles.status, isExceeded ? styles.exceeded : styles.safe]}>
          {isExceeded ? '⚠️ Exceeded' : '✅ Safe'}
        </Text>
      </View>
    </View>
  );
}

export const DEFAULT_POLLUTANTS: PollutantData[] = [
  { name: 'PM2.5', key: 'pm25', value: 0, unit: 'µg/m³', whoLimit: 15, color: POLLUTANT_COLORS.pm25 },
  { name: 'CO₂', key: 'co2', value: 0, unit: 'ppm', whoLimit: 1000, color: POLLUTANT_COLORS.co2 },
  { name: 'VOCs', key: 'voc', value: 0, unit: 'ppb', whoLimit: 500, color: POLLUTANT_COLORS.voc },
  { name: 'NO₂', key: 'no2', value: 0, unit: 'µg/m³', whoLimit: 40, color: POLLUTANT_COLORS.no2 },
];

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  value: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  number: {
    color: '#f1f5f9',
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  barContainer: {
    marginBottom: 8,
  },
  barBackground: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  whoLimit: {
    color: '#64748b',
    fontSize: 11,
  },
  status: {
    fontSize: 11,
    fontWeight: '600',
  },
  exceeded: {
    color: '#ef4444',
  },
  safe: {
    color: '#10b981',
  },
});
