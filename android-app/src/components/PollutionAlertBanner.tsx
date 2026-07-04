import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ALERT_COLORS } from '../theme/colors';
import { AlertStorage, type AlertRecord } from '../services/StorageService';

interface PollutionAlertBannerProps {
  aqi?: number;
  noise?: number;
  light?: number;
  onDismiss?: () => void;
}

export default function PollutionAlertBanner({ aqi, noise, light }: PollutionAlertBannerProps) {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadAlerts = useCallback(async () => {
    const history = await AlertStorage.getAlerts();
    setAlerts(history.filter((a) => !a.acknowledged).slice(0, 3));
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Check for new alerts based on current readings
  useEffect(() => {
    const newAlerts: AlertRecord[] = [];
    if (aqi !== undefined && aqi > 100) {
      newAlerts.push({
        id: `banner-aqi-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'aqi',
        severity: aqi > 150 ? 'critical' : 'warning',
        message: `AQI ${aqi} — ${aqi > 150 ? 'Unhealthy' : 'Moderate'}`,
        value: aqi,
        threshold: aqi > 150 ? 150 : 100,
        acknowledged: false,
      });
    }
    if (noise !== undefined && noise > 70) {
      newAlerts.push({
        id: `banner-noise-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'noise',
        severity: noise > 85 ? 'critical' : 'warning',
        message: `Noise ${noise.toFixed(1)} dB — ${noise > 85 ? 'Dangerous' : 'Loud'}`,
        value: noise,
        threshold: noise > 85 ? 85 : 70,
        acknowledged: false,
      });
    }
    if (light !== undefined && light > 1000) {
      newAlerts.push({
        id: `banner-light-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'light',
        severity: light > 2000 ? 'critical' : 'warning',
        message: `Light ${light.toFixed(0)} lux — Elevated`,
        value: light,
        threshold: light > 2000 ? 2000 : 1000,
        acknowledged: false,
      });
    }
    if (newAlerts.length > 0) {
      setAlerts((prev) => [...newAlerts, ...prev].slice(0, 5));
    }
  }, [aqi, noise, light]);

  const handleAcknowledge = async (id: string) => {
    await AlertStorage.acknowledgeAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAcknowledgeAll = async () => {
    for (const alert of alerts) {
      await AlertStorage.acknowledgeAlert(alert.id);
    }
    setAlerts([]);
  };

  const handleClearHistory = async () => {
    Alert.alert('Clear History', 'Are you sure you want to clear all alert history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await AlertStorage.clear();
          setAlerts([]);
          setShowHistory(false);
        },
      },
    ]);
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return ALERT_COLORS.critical;
      case 'warning':
        return ALERT_COLORS.warning;
      default:
        return ALERT_COLORS.info;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'aqi':
        return '🌫️';
      case 'noise':
        return '🔊';
      case 'light':
        return '💡';
      default:
        return '⚠️';
    }
  };

  if (alerts.length === 0 && !showHistory) {
    return null;
  }

  return (
    <View style={styles.container}>
      {alerts.length > 0 && !showHistory && (
        <View style={styles.bannerStack}>
          {alerts.map((alert) => (
            <View key={alert.id} style={[styles.banner, { borderLeftColor: getAlertColor(alert.severity) }]}>
              <Text style={styles.bannerIcon}>{getAlertIcon(alert.type)}</Text>
              <View style={styles.bannerText}>
                <Text style={[styles.bannerMessage, { color: getAlertColor(alert.severity) }]}>
                  {alert.message}
                </Text>
                <Text style={styles.bannerTime}>{new Date(alert.timestamp).toLocaleTimeString()}</Text>
              </View>
              <TouchableOpacity onPress={() => handleAcknowledge(alert.id)} style={styles.dismissBtn}>
                <Text style={styles.dismissText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {alerts.length > 1 && (
            <TouchableOpacity onPress={handleAcknowledgeAll} style={styles.ackAllBtn}>
              <Text style={styles.ackAllText}>Dismiss All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <TouchableOpacity
        onPress={() => setShowHistory(!showHistory)}
        style={styles.historyToggle}
      >
        <Text style={styles.historyToggleText}>
          {showHistory ? '▲ Hide Alert History' : '▼ Show Alert History'}
        </Text>
      </TouchableOpacity>

      {showHistory && (
        <ScrollView style={styles.historyList} nestedScrollEnabled>
          <TouchableOpacity onPress={handleClearHistory} style={styles.clearHistoryBtn}>
            <Text style={styles.clearHistoryText}>Clear All History</Text>
          </TouchableOpacity>
          {alerts.length === 0 ? (
            <Text style={styles.emptyText}>No active alerts</Text>
          ) : (
            alerts.map((alert) => (
              <View key={alert.id} style={[styles.historyItem, { borderLeftColor: getAlertColor(alert.severity) }]}>
                <Text style={styles.historyIcon}>{getAlertIcon(alert.type)}</Text>
                <View style={styles.historyText}>
                  <Text style={[styles.historyMessage, { color: getAlertColor(alert.severity) }]}>
                    {alert.message}
                  </Text>
                  <Text style={styles.historyTime}>
                    {new Date(alert.timestamp).toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleAcknowledge(alert.id)}>
                  <Text style={styles.historyDismiss}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  bannerStack: {
    gap: 6,
    marginBottom: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
  },
  bannerIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  bannerText: {
    flex: 1,
  },
  bannerMessage: {
    fontSize: 14,
    fontWeight: '700',
  },
  bannerTime: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  dismissBtn: {
    padding: 4,
  },
  dismissText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  ackAllBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ackAllText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
  },
  historyToggle: {
    paddingVertical: 8,
  },
  historyToggleText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  historyList: {
    maxHeight: 200,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 8,
  },
  clearHistoryBtn: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  clearHistoryText: {
    color: '#ef4444',
    fontSize: 12,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    padding: 16,
    fontSize: 13,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderLeftWidth: 3,
  },
  historyIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  historyText: {
    flex: 1,
  },
  historyMessage: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyTime: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 1,
  },
  historyDismiss: {
    color: '#94a3b8',
    fontSize: 14,
    padding: 4,
  },
});
