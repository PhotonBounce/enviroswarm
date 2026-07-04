import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NoiseMeter from '../components/NoiseMeter';

export default function NoiseMeterScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>🔊 Noise Meter</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Measure ambient noise levels using your device's microphone. 
          Readings are logged with your location and uploaded to help build a community noise map.
        </Text>
        <NoiseMeter />

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Understanding Noise Levels</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLevel}>30-50 dB</Text>
            <Text style={styles.infoDesc}>Quiet library, bedroom</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLevel}>50-60 dB</Text>
            <Text style={styles.infoDesc}>Normal conversation, office</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLevel}>60-70 dB</Text>
            <Text style={styles.infoDesc}>Busy street, restaurant</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLevel}>70-85 dB</Text>
            <Text style={styles.infoDesc}>Heavy traffic, alarm clock</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLevel, styles.dangerLevel]}>85+ dB</Text>
            <Text style={styles.infoDesc}>Hearing damage risk over time</Text>
          </View>
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
    width: 80,
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
});
