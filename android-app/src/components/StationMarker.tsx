import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import type { SensorStation } from '../types';

interface StationMarkerProps {
  station: SensorStation;
  onPress?: (station: SensorStation) => void;
}

export function StationMarker({ station, onPress }: StationMarkerProps) {
  return (
    <Marker
      coordinate={{
        latitude: station.latitude,
        longitude: station.longitude,
      }}
      onPress={() => onPress?.(station)}
    >
      <View style={styles.marker}>
        <Text style={styles.markerText}>
          {station.status === 'active' ? '🟢' : station.status === 'maintenance' ? '🟡' : '🔴'}
        </Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  marker: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: {
    fontSize: 18,
  },
});
