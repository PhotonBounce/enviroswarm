import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { NOISE_COLORS } from '../theme/colors';
import { NoiseStorage } from '../services/StorageService';
import { NotificationService } from '../services/NotificationService';
import { apiClient } from '../api/client';

// Simple RMS-based dB calculation from microphone amplitude
// Note: This is a relative dB estimation, not calibrated SPL
function calculateDecibels(rms: number): number {
  // Map RMS (0-1) to approximate dB range (30-120)
  const minDb = 30;
  const maxDb = 120;
  const db = minDb + (maxDb - minDb) * Math.min(rms * 4, 1);
  return db;
}

function getNoiseColor(db: number): string {
  if (db < 60) return NOISE_COLORS.safe;
  if (db < 70) return NOISE_COLORS.caution;
  if (db < 85) return NOISE_COLORS.warning;
  return NOISE_COLORS.danger;
}

function getNoiseLabel(db: number): string {
  if (db < 60) return 'Quiet';
  if (db < 70) return 'Moderate';
  if (db < 85) return 'Loud';
  return 'Dangerous';
}

interface NoiseMeterProps {
  onReading?: (db: number) => void;
  showLogButton?: boolean;
  compact?: boolean;
}

export default function NoiseMeter({ onReading, showLogButton = true, compact = false }: NoiseMeterProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [dbLevel, setDbLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<Audio.PermissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxDbRef = useRef(0);
  const alertSentRef = useRef(false);
  const startTimeRef = useRef<number>(0);

  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionStatus(status);
      return status === 'granted';
    } catch (e) {
      setError('Failed to request microphone permission');
      return false;
    }
  }, []);

  const startMetering = useCallback(async () => {
    setError(null);
    setLoading(true);

    const hasPermission = await requestPermission();
    if (!hasPermission) {
      setError('Microphone permission is required for noise measurement');
      setLoading(false);
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(rec);
      setIsRecording(true);
      startTimeRef.current = Date.now();
      maxDbRef.current = 0;
      alertSentRef.current = false;

      // Metering loop
      intervalRef.current = setInterval(async () => {
        try {
          const status = await rec.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            // iOS provides metering directly in dB (negative values)
            // Android: we need to estimate from amplitude
            let db: number;
            if (Platform.OS === 'ios') {
              db = status.metering + 120; // Convert from dBFS to approximate SPL
            } else {
              // For Android, use a rough estimation
              db = calculateDecibels(Math.abs(status.metering) / 100);
            }
            db = Math.max(30, Math.min(120, db));
            setDbLevel(db);
            if (db > maxDbRef.current) maxDbRef.current = db;

            // Alert threshold
            if (db > 85 && !alertSentRef.current) {
              alertSentRef.current = true;
              await NotificationService.sendNoiseAlert(db);
            }

            onReading?.(db);
          }
        } catch (e) {
          console.error('Metering error:', e);
        }
      }, 500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start recording');
    } finally {
      setLoading(false);
    }
  }, [requestPermission, onReading]);

  const stopMetering = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (e) {
        console.error('Stop recording error:', e);
      }
      setRecording(null);
    }

    setIsRecording(false);

    // Log the reading
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    if (durationSeconds > 0) {
      try {
        const location = await Location.getLastKnownPositionAsync();
        await NoiseStorage.addRecord({
          id: `noise-${Date.now()}`,
          timestamp: new Date().toISOString(),
          dbLevel: maxDbRef.current || dbLevel,
          latitude: location?.coords.latitude,
          longitude: location?.coords.longitude,
          durationSeconds,
        });

        // Upload to API
        await apiClient.post('/noise-readings', {
          db_level: maxDbRef.current || dbLevel,
          duration_seconds: durationSeconds,
          latitude: location?.coords.latitude,
          longitude: location?.coords.longitude,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Log noise error:', e);
      }
    }
  }, [recording, dbLevel]);

  useEffect(() => {
    return () => {
      stopMetering();
    };
  }, [stopMetering]);

  const color = getNoiseColor(dbLevel);
  const label = getNoiseLabel(dbLevel);

  if (compact) {
    return (
      <View style={[styles.compactContainer, { borderColor: color }]}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactTitle}>🔊 Noise</Text>
          <Text style={[styles.compactValue, { color }]}>{dbLevel.toFixed(1)} dB</Text>
        </View>
        <View style={styles.barBackground}>
          <View style={[styles.barFill, { width: `${((dbLevel - 30) / 90) * 100}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.compactLabel}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔊 Noise Meter</Text>
        <TouchableOpacity
          style={[styles.toggleButton, { backgroundColor: isRecording ? '#ef4444' : '#10b981' }]}
          onPress={isRecording ? stopMetering : startMetering}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.toggleButtonText}>{isRecording ? 'Stop' : 'Start'}</Text>
          )}
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={requestPermission}>
            <Text style={styles.retryText}>Retry Permission</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.gaugeContainer}>
        <Text style={[styles.dbValue, { color }]}>{dbLevel.toFixed(1)}</Text>
        <Text style={styles.dbUnit}>dB</Text>
        <Text style={[styles.dbLabel, { color }]}>{label}</Text>
      </View>

      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <View style={[styles.barFill, { width: `${((dbLevel - 30) / 90) * 100}%`, backgroundColor: color }]} />
        </View>
        <View style={styles.scale}>
          <Text style={styles.scaleText}>30</Text>
          <Text style={styles.scaleText}>60</Text>
          <Text style={styles.scaleText}>90</Text>
          <Text style={styles.scaleText}>120</Text>
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: NOISE_COLORS.safe }]} />
          <Text style={styles.legendText}>Quiet (&lt;60)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: NOISE_COLORS.caution }]} />
          <Text style={styles.legendText}>Moderate (60-70)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: NOISE_COLORS.warning }]} />
          <Text style={styles.legendText}>Loud (70-85)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: NOISE_COLORS.danger }]} />
          <Text style={styles.legendText}>Dangerous (&gt;85)</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '700',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: '#7f1d1d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
  },
  retryText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  dbValue: {
    fontSize: 56,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  dbUnit: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  dbLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  barContainer: {
    marginBottom: 12,
  },
  barBackground: {
    height: 12,
    backgroundColor: '#334155',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  scale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scaleText: {
    color: '#64748b',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  compactContainer: {
    borderLeftWidth: 4,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  compactTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  compactValue: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  compactLabel: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
});
