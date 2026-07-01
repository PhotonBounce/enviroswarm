import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SensorReading, SENSOR_UNITS } from '../types';

interface SensorCardProps {
  reading: SensorReading;
}

export function SensorCard({ reading }: SensorCardProps) {
  const unit = SENSOR_UNITS[reading.sensor_type] || reading.unit;
  const date = new Date(reading.timestamp);
  const timestampStr = isNaN(date.getTime()) ? '—' : date.toLocaleString();
  return (
    <View style={styles.card}>
      <Text style={styles.type}>{reading.sensor_type.replace(/_/g, ' ').toUpperCase()}</Text>
      <Text style={styles.value}>
        {typeof reading.value === 'number' ? (Number.isFinite(reading.value) ? reading.value.toFixed(2) : '—') : reading.value} {unit}
      </Text>
      <Text style={styles.timestamp}>{timestampStr}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  type: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    color: '#f1f5f9',
    fontSize: 22,
    fontWeight: '700',
  },
  timestamp: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
});
