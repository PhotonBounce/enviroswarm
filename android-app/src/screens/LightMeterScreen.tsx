import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LightMeter from '../components/LightMeter';

export default function LightMeterScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>💡 Light Meter</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Measure ambient light levels using your device's brightness sensor. 
          Monitor light pollution and get automatic night mode detection.
        </Text>
        <LightMeter />

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Light Level Reference</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLevel}>0.25-1 lux</Text>
            <Text style={styles.infoDesc}>Full moon, starlight</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLevel}>10-50 lux</Text>
            <Text style={styles.infoDesc}>Street lighting, dim room</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLevel}>100-500 lux</Text>
            <Text style={styles.infoDesc}>Office lighting, overcast day</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLevel}>1000-5000 lux</Text>
            <Text style={styles.infoDesc}>Bright office, sunny day</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLevel, styles.dangerLevel]}>10000+ lux</Text>
            <Text style={styles.infoDesc}>Direct sunlight, very bright</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Light Pollution Tips</Text>
          <Text style={styles.tipText}>• Use warm-colored lights (2700K) in the evening</Text>
          <Text style={styles.tipText}>• Install dimmer switches or motion sensors</Text>
          <Text style={styles.tipText}>• Use blackout curtains for better sleep</Text>
          <Text style={styles.tipText}>• Shield outdoor lights to direct them downward</Text>
          <Text style={styles.tipText}>• Turn off unnecessary lights at night</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  description: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  infoTitle: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  infoLevel: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: 14,
    width: 110,
  },
  dangerLevel: {
    color: '#ef4444',
  },
  infoDesc: {
    color: '#94a3b8',
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
  tipText: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 22,
  },
});
