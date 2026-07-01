import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../api/client';
import { SensorStation, SensorType, SENSOR_TYPES, ApiResponse } from '../types';
import { useLocation } from '../hooks/useLocation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface Props {
  navigation: NativeStackNavigationProp<any>;
}

export default function StationsScreen({ navigation }: Props) {
  const [stations, setStations] = useState<SensorStation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<SensorType[]>(['temperature']);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { getCurrentLocation } = useLocation();
  const insets = useSafeAreaInsets();

  const fetchStations = async () => {
    setRefreshing(true);
    try {
      const res = await apiClient.get<ApiResponse<SensorStation[]>>('/stations');
      if (res.data?.success) {
        setStations(res.data.data || []);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load stations');
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStations();
    }, [])
  );

  const openCreateModal = async () => {
    const loc = await getCurrentLocation();
    setName('');
    setSelectedTypes(['temperature']);
    setLat(loc?.latitude !== null && loc?.latitude !== undefined ? String(loc.latitude) : '');
    setLon(loc?.longitude !== null && loc?.longitude !== undefined ? String(loc.longitude) : '');
    setModalVisible(true);
  };

  const toggleType = (t: SensorType) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const createStation = async () => {
    if (!name.trim() || selectedTypes.length === 0) {
      Alert.alert('Validation', 'Name and at least one sensor type required');
      return;
    }
    const latVal = lat.trim() !== '' ? parseFloat(lat) : null;
    const lonVal = lon.trim() !== '' ? parseFloat(lon) : null;
    if (lat.trim() === '' || isNaN(latVal ?? NaN)) {
      Alert.alert('Validation', 'Latitude must be a valid number');
      return;
    }
    if (lon.trim() === '' || isNaN(lonVal ?? NaN)) {
      Alert.alert('Validation', 'Longitude must be a valid number');
      return;
    }
    setIsCreating(true);
    try {
      const res = await apiClient.post<ApiResponse<SensorStation>>('/stations', {
        name,
        sensor_types: selectedTypes,
        latitude: latVal,
        longitude: lonVal,
      });
      if (res.data?.success) {
        setModalVisible(false);
        fetchStations();
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to create station');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create station');
    } finally {
      setIsCreating(false);
    }
  };

  const renderItem = ({ item }: { item: SensorStation }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('DataView', { stationId: item.id, stationName: item.name })}
    >
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.cardMeta}>
        {item.status} • {item.sensor_types.join(', ')}
      </Text>
      <Text style={styles.cardCoords}>
        {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={stations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchStations} tintColor="#10b981" />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No stations yet. Add your first one!</Text>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: 20 + insets.bottom }]}
        onPress={openCreateModal}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContent}
          >
            <ScrollView>
              <Text style={styles.modalTitle}>New Station</Text>

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Station name"
                placeholderTextColor="#64748b"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Sensor Types</Text>
              <View style={styles.chipRow}>
                {SENSOR_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, selectedTypes.includes(t) && styles.chipActive]}
                    onPress={() => toggleType(t)}
                  >
                    <Text style={[styles.chipText, selectedTypes.includes(t) && styles.chipTextActive]}>
                      {t.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Latitude</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={lat}
                onChangeText={setLat}
                placeholder="Auto-filled"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.label}>Longitude</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={lon}
                onChangeText={setLon}
                placeholder="Auto-filled"
                placeholderTextColor="#64748b"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={createStation} disabled={isCreating}>
                  <Text style={styles.saveBtnText}>{isCreating ? 'Creating...' : 'Create'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
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
  cardCoords: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#10b981',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  fabText: {
    color: '#020617',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 6,
  },
  chipActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: '#10b981',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  cancelBtn: {
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cancelBtnText: {
    color: '#f1f5f9',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  saveBtnText: {
    color: '#020617',
    fontWeight: '700',
  },
});
