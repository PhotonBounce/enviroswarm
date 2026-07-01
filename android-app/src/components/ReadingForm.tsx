import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SensorType, SENSOR_TYPES, SENSOR_UNITS } from '../types';

interface ReadingFormProps {
  stationId: string;
  initialLat?: number;
  initialLon?: number;
  onSubmit: (data: {
    station_id: string;
    sensor_type: SensorType;
    value: number;
    unit: string;
    lat?: number;
    lon?: number;
  }) => void;
  loading?: boolean;
}

export function ReadingForm({ stationId, initialLat, initialLon, onSubmit, loading }: ReadingFormProps) {
  const [sensorType, setSensorType] = useState<SensorType>('temperature');
  const [value, setValue] = useState('');
  const [lat, setLat] = useState(initialLat?.toString() || '');
  const [lon, setLon] = useState(initialLon?.toString() || '');

  // Sync lat/lon when parent re-renders with new coordinates
  useEffect(() => {
    if (initialLat !== undefined) setLat(String(initialLat));
    if (initialLon !== undefined) setLon(String(initialLon));
  }, [initialLat, initialLon]);

  const handleSubmit = () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      Alert.alert('Invalid Input', 'Please enter a valid numeric value.');
      return;
    }
    const numLat = lat !== '' ? parseFloat(lat) : undefined;
    const numLon = lon !== '' ? parseFloat(lon) : undefined;
    if ((numLat !== undefined && isNaN(numLat)) || (numLon !== undefined && isNaN(numLon))) {
      Alert.alert('Invalid Input', 'Please enter valid coordinates.');
      return;
    }
    onSubmit({
      station_id: stationId,
      sensor_type: sensorType,
      value: numValue,
      unit: SENSOR_UNITS[sensorType],
      lat: numLat,
      lon: numLon,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Sensor Type</Text>
        <View style={styles.typeRow}>
          {SENSOR_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeChip, sensorType === t && styles.typeChipActive]}
              onPress={() => setSensorType(t)}
            >
              <Text style={[styles.typeChipText, sensorType === t && styles.typeChipTextActive]}>
                {t.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Value ({SENSOR_UNITS[sensorType]})</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={value}
          onChangeText={setValue}
          placeholder="Enter reading..."
          placeholderTextColor="#64748b"
          returnKeyType="done"
        />

        <Text style={styles.label}>Latitude (optional)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={lat}
          onChangeText={setLat}
          placeholder="Auto-filled from GPS"
          placeholderTextColor="#64748b"
          returnKeyType="done"
        />

        <Text style={styles.label}>Longitude (optional)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={lon}
          onChangeText={setLon}
          placeholder="Auto-filled from GPS"
          placeholderTextColor="#64748b"
          returnKeyType="done"
        />

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || !value}
        >
          <Text style={styles.submitBtnText}>{loading ? 'Submitting...' : 'Submit Reading'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1e293b',
    color: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 6,
  },
  typeChipActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  typeChipText: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  typeChipTextActive: {
    color: '#10b981',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#020617',
    fontSize: 16,
    fontWeight: '700',
  },
});
