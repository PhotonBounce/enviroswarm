import { PermissionsAndroid, Platform } from 'react-native';

// BLE service for connecting to environmental sensors
// Supports Xiaomi Mi, Awair, and generic BLE Environmental Sensing (0x181A)

export interface BLESensorData {
  deviceId: string;
  deviceName: string;
  manufacturer?: string;
  timestamp: string;
  temperature?: number; // °C
  humidity?: number; // %
  pressure?: number; // hPa
  pm25?: number; // µg/m³
  pm10?: number; // µg/m³
  co2?: number; // ppm
  voc?: number; // ppb
  formaldehyde?: number; // mg/m³
  battery?: number; // %
  signalStrength?: number; // RSSI
}

// GATT Characteristic UUIDs
const ENV_SENSE_SERVICE = '0x181A';
const TEMP_CHAR = '0x2A6E';
const HUMIDITY_CHAR = '0x2A6F';
const PRESSURE_CHAR = '0x2A6D';
const PM25_CHAR = '00002a6e-0000-1000-8000-00805f9b34fb'; // Custom mapping
const CO2_CHAR = '00002a6f-0000-1000-8000-00805f9b34fb';
const VOC_CHAR = '00002a70-0000-1000-8000-00805f9b34fb';

// Known device UUIDs
const XIAOMI_MI_SERVICE = '0000fe95-0000-1000-8000-00805f9b34fb';
const AWAIR_SERVICE = '0000fc00-0000-1000-8000-00805f9b34fb';

export class BLESensorService {
  private static instance: BLESensorService | null = null;
  private connectedDevice: string | null = null;
  private scanListeners: Set<(data: BLESensorData) => void> = new Set();
  private disconnectListeners: Set<(deviceId: string) => void> = new Set();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelayMs = 3000;
  private isScanning = false;

  static getInstance(): BLESensorService {
    if (!BLESensorService.instance) {
      BLESensorService.instance = new BLESensorService();
    }
    return BLESensorService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      return (
        results['android.permission.ACCESS_FINE_LOCATION'] === 'granted' &&
        results['android.permission.BLUETOOTH_SCAN'] === 'granted' &&
        results['android.permission.BLUETOOTH_CONNECT'] === 'granted'
      );
    }
    // iOS permissions are handled via Info.plist and request during scan
    return true;
  }

  // Note: This is a stub implementation since react-native-ble-plx is not installed
  // In a real app, you would import { BleManager } from 'react-native-ble-plx';
  // and implement full BLE scanning/connecting/reading here.
  // The code below provides the full interface and simulates behavior for demonstration.

  async startScan(onDeviceFound: (data: BLESensorData) => void): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Bluetooth permissions denied');
    }

    this.isScanning = true;
    this.scanListeners.add(onDeviceFound);

    // Simulate discovering a mock BLE sensor for demonstration
    // In production, this would use BleManager.startDeviceScan()
    console.log('[BLE] Scanning started...');

    // Simulated discovery after 2s
    setTimeout(() => {
      if (this.isScanning) {
        const mockData: BLESensorData = {
          deviceId: 'mock-ble-001',
          deviceName: 'Mock Env Sensor',
          manufacturer: 'Generic',
          timestamp: new Date().toISOString(),
          temperature: 22.5,
          humidity: 45.2,
          pressure: 1013.2,
          pm25: 12.3,
          pm10: 18.7,
          co2: 420,
          voc: 85,
          battery: 78,
          signalStrength: -62,
        };
        onDeviceFound(mockData);
      }
    }, 2000);
  }

  stopScan(): void {
    this.isScanning = false;
    this.scanListeners.clear();
    console.log('[BLE] Scanning stopped');
  }

  async connect(deviceId: string): Promise<boolean> {
    this.connectedDevice = deviceId;
    this.reconnectAttempts.set(deviceId, 0);
    console.log(`[BLE] Connected to ${deviceId}`);
    return true;
  }

  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      this.disconnectListeners.forEach((cb) => cb(this.connectedDevice!));
      this.connectedDevice = null;
      console.log('[BLE] Disconnected');
    }
  }

  async readSensorData(deviceId?: string): Promise<BLESensorData | null> {
    const target = deviceId || this.connectedDevice;
    if (!target) return null;

    // Simulated read for demonstration
    return {
      deviceId: target,
      deviceName: 'Connected Sensor',
      timestamp: new Date().toISOString(),
      temperature: 20 + Math.random() * 10,
      humidity: 30 + Math.random() * 40,
      pressure: 1000 + Math.random() * 30,
      pm25: Math.random() * 50,
      pm10: Math.random() * 80,
      co2: 350 + Math.random() * 200,
      voc: Math.random() * 200,
      battery: 50 + Math.random() * 50,
      signalStrength: -70 + Math.random() * 20,
    };
  }

  async enableNotifications(
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string,
    onData: (value: number) => void
  ): Promise<void> {
    console.log(`[BLE] Enabled notifications for ${characteristicUUID} on ${deviceId}`);
    // In production: subscribe to characteristic notifications
  }

  async disableNotifications(deviceId: string, serviceUUID: string, characteristicUUID: string): Promise<void> {
    console.log(`[BLE] Disabled notifications for ${characteristicUUID} on ${deviceId}`);
  }

  onDisconnect(callback: (deviceId: string) => void): () => void {
    this.disconnectListeners.add(callback);
    return () => this.disconnectListeners.delete(callback);
  }

  private async attemptReconnect(deviceId: string): Promise<void> {
    const attempts = this.reconnectAttempts.get(deviceId) || 0;
    if (attempts >= this.maxReconnectAttempts) {
      console.log(`[BLE] Max reconnect attempts reached for ${deviceId}`);
      return;
    }

    this.reconnectAttempts.set(deviceId, attempts + 1);
    console.log(`[BLE] Reconnecting to ${deviceId} (attempt ${attempts + 1})...`);

    await new Promise((resolve) => setTimeout(resolve, this.reconnectDelayMs));
    await this.connect(deviceId);
  }

  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  getConnectedDevice(): string | null {
    return this.connectedDevice;
  }
}

// Helper to parse Xiaomi Mi sensor data format
export function parseXiaomiMiData(rawData: Uint8Array): Partial<BLESensorData> {
  // Xiaomi Mi Air Quality Monitor data format (simplified)
  const data: Partial<BLESensorData> = {};
  if (rawData.length >= 2) {
    data.temperature = rawData[0] + rawData[1] / 100;
  }
  if (rawData.length >= 4) {
    data.humidity = rawData[2] + rawData[3] / 100;
  }
  return data;
}

// Helper to parse Awair sensor data format
export function parseAwairData(rawData: Uint8Array): Partial<BLESensorData> {
  const data: Partial<BLESensorData> = {};
  if (rawData.length >= 2) {
    data.temperature = (rawData[0] | (rawData[1] << 8)) / 100;
  }
  if (rawData.length >= 4) {
    data.humidity = (rawData[2] | (rawData[3] << 8)) / 100;
  }
  if (rawData.length >= 6) {
    data.co2 = rawData[4] | (rawData[5] << 8);
  }
  if (rawData.length >= 8) {
    data.voc = rawData[6] | (rawData[7] << 8);
  }
  return data;
}

// Helper to parse generic Environmental Sensing service data
export function parseEnvironmentalSensingData(
  characteristicUUID: string,
  rawData: Uint8Array
): Partial<BLESensorData> {
  const data: Partial<BLESensorData> = {};
  const uuid = characteristicUUID.toLowerCase();

  if (uuid.includes('2a6e')) {
    // Temperature
    data.temperature = (rawData[0] | (rawData[1] << 8)) / 100;
  } else if (uuid.includes('2a6f')) {
    // Humidity
    data.humidity = (rawData[0] | (rawData[1] << 8)) / 100;
  } else if (uuid.includes('2a6d')) {
    // Pressure
    data.pressure = (rawData[0] | (rawData[1] << 8) | (rawData[2] << 16) | (rawData[3] << 24)) / 10;
  }

  return data;
}
