import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getAQIColor, getAQILabel } from '../theme/colors';

interface HealthAdvisoryProps {
  aqi: number;
  compact?: boolean;
}

export default function HealthAdvisory({ aqi, compact = false }: HealthAdvisoryProps) {
  const color = getAQIColor(aqi);
  const label = getAQILabel(aqi);

  const riskLevel = aqi <= 50 ? 'Low' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'High' : aqi <= 200 ? 'Very High' : aqi <= 300 ? 'Severe' : 'Emergency';

  const getAdvice = () => {
    if (aqi <= 50) {
      return {
        icon: '✅',
        title: 'Air quality is satisfactory',
        actions: [
          'Enjoy outdoor activities',
          'Open windows for ventilation',
          'No precautions needed',
        ],
      };
    } else if (aqi <= 100) {
      return {
        icon: '⚠️',
        title: 'Air quality is acceptable for most',
        actions: [
          'Sensitive groups: reduce prolonged outdoor exertion',
          'Keep windows open during low traffic hours',
          'Monitor symptoms if you have asthma or heart conditions',
        ],
      };
    } else if (aqi <= 150) {
      return {
        icon: '🔶',
        title: 'Unhealthy for sensitive groups',
        actions: [
          'Avoid outdoor activities if you have respiratory conditions',
          'Wear N95 mask if going outside',
          'Keep windows closed, use air purifier',
          'Children and elderly should stay indoors',
        ],
      };
    } else if (aqi <= 200) {
      return {
        icon: '🔴',
        title: 'Unhealthy for everyone',
        actions: [
          'Avoid outdoor activities completely',
          'Wear N95 mask if you must go outside',
          'Use air purifiers indoors with closed windows',
          'Seek medical attention if experiencing breathing difficulties',
        ],
      };
    } else if (aqi <= 300) {
      return {
        icon: '🟣',
        title: 'Very unhealthy — emergency conditions',
        actions: [
          'Stay indoors at all times',
          'Seal windows and doors',
          'Use HEPA air purifiers on highest setting',
          'Seek immediate medical attention for symptoms',
        ],
      };
    } else {
      return {
        icon: '☠️',
        title: 'Hazardous — health emergency',
        actions: [
          'EVACUATE if possible to area with better air quality',
          'Remain indoors with sealed environment',
          'Seek emergency medical care for any respiratory symptoms',
          'Follow local emergency broadcasts',
        ],
      };
    }
  };

  const advice = getAdvice();

  if (compact) {
    return (
      <View style={[styles.compactContainer, { borderColor: color }]}>
        <Text style={[styles.compactRisk, { color }]}>{riskLevel} Risk</Text>
        <Text style={styles.compactAdvice} numberOfLines={2}>
          {advice.icon} {advice.actions[0]}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: color + '20' }]}>
        <Text style={styles.headerIcon}>{advice.icon}</Text>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color }]}>{advice.title}</Text>
          <Text style={styles.headerSubtitle}>
            AQI {Math.round(aqi)} — {label}
          </Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: color }]}>
          <Text style={styles.riskBadgeText}>{riskLevel}</Text>
        </View>
      </View>

      <View style={styles.actionsList}>
        {advice.actions.map((action, index) => (
          <View key={index} style={styles.actionItem}>
            <Text style={[styles.actionBullet, { color }]}>●</Text>
            <Text style={styles.actionText}>{action}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  riskBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  actionsList: {
    padding: 14,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  actionBullet: {
    fontSize: 8,
    marginRight: 8,
    marginTop: 5,
  },
  actionText: {
    color: '#e2e8f0',
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
  compactContainer: {
    borderLeftWidth: 4,
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  compactRisk: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  compactAdvice: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
});
