import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { getAQIColor, getAQILabel } from '../theme/colors';

interface AQIGaugeProps {
  aqi: number;
  size?: number;
  animated?: boolean;
}

export default function AQIGauge({ aqi, size = 200, animated = true }: AQIGaugeProps) {
  const color = getAQIColor(aqi);
  const label = getAQILabel(aqi);
  const rotation = useRef(new Animated.Value(0)).current;

  const clampedAQI = Math.min(Math.max(aqi, 0), 500);
  const percentage = clampedAQI / 500;
  const targetRotation = percentage * 180 - 90; // -90 to 90 degrees

  useEffect(() => {
    if (animated) {
      Animated.spring(rotation, {
        toValue: targetRotation,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      rotation.setValue(targetRotation);
    }
  }, [targetRotation, animated]);

  const scale = size / 200;

  return (
    <View style={[styles.container, { width: size, height: size * 0.65 }]}>
      {/* Background arc */}
      <View style={[styles.arcContainer, { width: size, height: size * 0.5 }]}>
        <View
          style={[
            styles.arc,
            {
              width: size,
              height: size * 0.5,
              borderRadius: size / 2,
              borderWidth: 12 * scale,
              borderColor: '#1e293b',
            },
          ]}
        />
        {/* Colored progress arc overlay */}
        <View
          style={[
            styles.progressArc,
            {
              width: size,
              height: size * 0.5,
              borderRadius: size / 2,
              borderWidth: 12 * scale,
              borderColor: color,
              borderTopColor: 'transparent',
              borderRightColor: percentage > 0.5 ? color : 'transparent',
              transform: [
                { rotate: `${-90 + percentage * 180}deg` },
              ],
            },
          ]}
        />
      </View>

      {/* Needle */}
      <Animated.View
        style={[
          styles.needle,
          {
            width: 4 * scale,
            height: size * 0.42,
            bottom: size * 0.05,
            backgroundColor: color,
            transform: [
              { translateX: -2 * scale },
              { rotate: rotation.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }) },
            ],
          },
        ]}
      />

      {/* Center pivot */}
      <View style={[styles.pivot, { width: 16 * scale, height: 16 * scale, bottom: size * 0.05 - 8 * scale, backgroundColor: color }]} />

      {/* AQI Value */}
      <View style={[styles.valueContainer, { bottom: size * 0.05 + 12 * scale }]}>
        <Text style={[styles.aqiValue, { fontSize: 48 * scale, color }]}>{Math.round(aqi)}</Text>
        <Text style={[styles.aqiLabel, { fontSize: 14 * scale }]}>{label}</Text>
      </View>

      {/* Scale markers */}
      <View style={styles.markers}>
        <Text style={[styles.markerText, { fontSize: 10 * scale }]}>0</Text>
        <Text style={[styles.markerText, { fontSize: 10 * scale }]}>250</Text>
        <Text style={[styles.markerText, { fontSize: 10 * scale }]}>500</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  arcContainer: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  arc: {
    position: 'absolute',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  progressArc: {
    position: 'absolute',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  needle: {
    position: 'absolute',
    borderRadius: 2,
    transformOrigin: 'bottom center',
  },
  pivot: {
    position: 'absolute',
    borderRadius: 8,
  },
  valueContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  aqiValue: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  aqiLabel: {
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  markers: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  markerText: {
    color: '#64748b',
    fontVariant: ['tabular-nums'],
  },
});
