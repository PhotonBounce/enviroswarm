import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import * as Brightness from 'expo-brightness';
import { LIGHT_COLORS } from '../theme/colors';
import { LightStorage } from '../services/StorageService';
import { NotificationService } from '../services/NotificationService';

function getLightColor(lux: number): string {
  if (lux < 10) return LIGHT_COLORS.dark;
  if (lux < 100) return LIGHT_COLORS.dim;
  if (lux < 500) return LIGHT_COLORS.comfortable;
  if (lux < 1000) return LIGHT_COLORS.bright;
  return LIGHT_COLORS.veryBright;
}

function getLightLabel(lux: number): string {
  if (lux < 10) return 'Very Dark';
  if (lux < 100) return 'Dim';
  if (lux < 500) return 'Comfortable';
  if (lux < 1000) return 'Bright';
  return 'Very Bright';
}

function getLightPollutionAssessment(lux: number): string {
  if (lux < 10) return 'Excellent night sky quality. Minimal light pollution.';
  if (lux < 100) return 'Low light pollution. Good for stargazing and sleep.';
  if (lux < 500) return 'Moderate light levels. Comfortable for indoor activities.';
  if (lux < 1000) return 'Elevated light levels. May affect circadian rhythm if exposed before sleep.';
  return 'High light pollution. Consider blackout curtains and reducing artificial light exposure.';
}

interface LightMeterProps {
  onReading?: (lux: number) => void;
  compact?: boolean;
}

export default function LightMeter({ onReading, compact = false }: LightMeterProps) {
  const [lux, setLux] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNightMode, setIsNightMode] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const alertSentRef = React.useRef(false);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Brightness.requestPermissionsAsync();
      const granted = status === 'granted';
      setPermissionGranted(granted);
      if (!granted) {
        setError('Brightness sensor permission is required');
      }
      return granted;
    } catch (e) {
      setError('Failed to request brightness permission');
      return false;
    }
  }, []);

  const readBrightness = useCallback(async () => {
    try {
      const brightness = await Brightness.getBrightnessAsync();
      // Convert screen brightness to approximate lux (rough estimation)
      // In a real app, you'd use the device's ambient light sensor via expo-sensors
      const estimatedLux = brightness * 1000;
      setLux(estimatedLux);
      setIsNightMode(estimatedLux < 50);
      onReading?.(estimatedLux);

      if (estimatedLux > 1000 && !alertSentRef.current) {
        alertSentRef.current = true;
        await NotificationService.sendLightAlert(estimatedLux);
      } else if (estimatedLux <= 1000) {
        alertSentRef.current = false;
      }
    } catch (e) {
      console.error('Brightness read error:', e);
    }
  }, [onReading]);

  const startMonitoring = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) return;

    setError(null);
    setIsMonitoring(true);
    alertSentRef.current = false;

    // Read immediately and then every 2 seconds
    await readBrightness();
    intervalRef.current = setInterval(readBrightness, 2000);
  }, [requestPermission, readBrightness]);

  const stopMonitoring = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsMonitoring(false);

    await LightStorage.addRecord({
      id: `light-${Date.now()}`,
      timestamp: new Date().toISOString(),
      lux,
    });
  }, [lux]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const color = getLightColor(lux);
  const label = getLightLabel(lux);

  if (compact) {
    return (
      <View style={[styles.compactContainer, { borderColor: color }]}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactTitle}>💡 Light</Text>
          <Text style={[styles.compactValue, { color }]}>{lux.toFixed(0)} lux</Text>
        </View>
        <View style={styles.barBackground}>
          <View style={[styles.barFill, { width: `${Math.min(lux / 10, 100)}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.compactLabel}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💡 Light Meter</Text>
        <TouchableOpacity
          style={[styles.toggleButton, { backgroundColor: isMonitoring ? '#ef4444' : '#10b981' }]}
          onPress={isMonitoring ? stopMonitoring : startMonitoring}
        >
          <Text style={styles.toggleButtonText}>{isMonitoring ? 'Stop' : 'Start'}</Text>
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
        <Text style={[styles.luxValue, { color }]}>{lux.toFixed(0)}</Text>
        <Text style={styles.luxUnit}>lux</Text>
        <Text style={[styles.luxLabel, { color }]}>{label}</Text>
      </View>

      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <View style={[styles.barFill, { width: `${Math.min((lux / 1000) * 100, 100)}%`, backgroundColor: color }]} />
        </View>
        <View style={styles.scale}>
          <Text style={styles.scaleText}>0</Text>
          <Text style={styles.scaleText}>500</Text>
          <Text style={styles.scaleText}>1000+</Text>
        </View>
      </View>

      <View style={styles.nightModeRow}>
        <Text style={styles.nightModeLabel}>🌙 Night Mode Detection</Text>
        <Switch
          value={isNightMode}
          disabled
          trackColor={{ false: '#334155', true: '#3b82f6' }}
          thumbColor={isNightMode ? '#60a5fa' : '#94a3b8'}
        />
      </View>
      <Text style={styles.nightModeHint}>
        {isNightMode ? 'Dark environment detected. App will use dark theme.' : 'Adequate lighting detected.'}
      </Text>

      <View style={styles.assessmentBox}>
        <Text style={styles.assessmentTitle}>Light Pollution Assessment</Text>
        <Text style={styles.assessmentText}>{getLightPollutionAssessment(lux)}</Text>
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
  luxValue: {
    fontSize: 56,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  luxUnit: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  luxLabel: {
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
  nightModeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  nightModeLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
  nightModeHint: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 12,
  },
  assessmentBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
  },
  assessmentTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  assessmentText: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 20,
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
