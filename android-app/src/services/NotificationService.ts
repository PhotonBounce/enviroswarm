import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AlertStorage, type AlertRecord } from './StorageService';
import { getAQILabel, getAQIColor } from '../theme/colors';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  } as any),
});

export class NotificationService {
  static async init(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync() as any;
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync() as any;
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('pollution-alerts', {
        name: 'Pollution Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ef4444',
      });
      await Notifications.setNotificationChannelAsync('health-advisories', {
        name: 'Health Advisories',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    return true;
  }

  static async sendAQIAlert(aqi: number, location?: string): Promise<void> {
    const label = getAQILabel(aqi);
    const color = getAQIColor(aqi);
    const loc = location ? ` at ${location}` : '';

    const alert: AlertRecord = {
      id: `aqi-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'aqi',
      severity: aqi > 150 ? 'critical' : aqi > 100 ? 'warning' : 'info',
      message: `AQI ${aqi} — ${label}${loc}`,
      value: aqi,
      threshold: aqi > 150 ? 150 : 100,
      acknowledged: false,
    };

    await AlertStorage.addAlert(alert);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⚠️ Air Quality Alert${loc}`,
        body: `AQI ${aqi} — ${label}. Consider limiting outdoor activities.`,
        data: { type: 'aqi', aqi, color },
        sound: aqi > 150 ? 'default' : undefined,
      },
      trigger: null,
    });
  }

  static async sendNoiseAlert(dbLevel: number): Promise<void> {
    const alert: AlertRecord = {
      id: `noise-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'noise',
      severity: dbLevel > 85 ? 'critical' : 'warning',
      message: `Noise level ${dbLevel.toFixed(1)} dB detected`,
      value: dbLevel,
      threshold: dbLevel > 85 ? 85 : 70,
      acknowledged: false,
    };

    await AlertStorage.addAlert(alert);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔊 Noise Alert',
        body: `Noise level reached ${dbLevel.toFixed(1)} dB. Prolonged exposure may cause hearing damage.`,
        data: { type: 'noise', dbLevel },
        sound: dbLevel > 85 ? 'default' : undefined,
      },
      trigger: null,
    });
  }

  static async sendLightAlert(lux: number): Promise<void> {
    const alert: AlertRecord = {
      id: `light-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'light',
      severity: lux > 2000 ? 'critical' : 'warning',
      message: `Light level ${lux.toFixed(0)} lux detected`,
      value: lux,
      threshold: lux > 2000 ? 2000 : 1000,
      acknowledged: false,
    };

    await AlertStorage.addAlert(alert);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💡 Light Pollution Alert',
        body: `Ambient light reached ${lux.toFixed(0)} lux. Consider reducing exposure for better sleep quality.`,
        data: { type: 'light', lux },
      },
      trigger: null,
    });
  }

  static async sendHealthAdvisory(aqi: number): Promise<void> {
    let advice = '';
    if (aqi <= 50) advice = 'Air quality is good. Enjoy outdoor activities!';
    else if (aqi <= 100) advice = 'Air quality is acceptable. Sensitive individuals should reduce prolonged outdoor exertion.';
    else if (aqi <= 150) advice = 'Unhealthy for sensitive groups. Reduce outdoor activities. Wear a mask if going outside.';
    else if (aqi <= 200) advice = 'Unhealthy for everyone. Avoid outdoor activities. Use air purifiers indoors. Wear N95 mask if you must go out.';
    else if (aqi <= 300) advice = 'Very unhealthy. Stay indoors. Keep windows closed. Use air purifiers. Seek medical attention if experiencing symptoms.';
    else advice = 'Hazardous conditions. Emergency conditions. Everyone should remain indoors. Seek immediate medical attention for breathing difficulties.';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏥 Health Advisory',
        body: advice,
        data: { type: 'health', aqi },
      },
      trigger: null,
    });
  }

  static async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  static async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  static async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }
}
