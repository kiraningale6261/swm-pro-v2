import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { workerAPI } from '@/lib/api';

const LOCATION_TASK_NAME = 'background-location-task';
const TRACKING_INTERVAL = 30000; // 30 seconds

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

class GPSTracker {
  private isTracking = false;
  private lastLocationTime = 0;
  private locationUpdateCallback: ((location: LocationData) => void) | null = null;

  async initialize() {
    try {
      // Request foreground permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        throw new Error('Foreground location permission denied');
      }

      // Request background permissions
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission denied - tracking will stop when app is backgrounded');
      }

      return true;
    } catch (error) {
      console.error('GPS initialization error:', error);
      throw error;
    }
  }

  async startTracking(userId: number, deviceId: string, imei?: string) {
    try {
      if (this.isTracking) {
        console.warn('Tracking already active');
        return;
      }

      // Store tracking info
      await AsyncStorage.setItem('tracking_user_id', userId.toString());
      await AsyncStorage.setItem('tracking_device_id', deviceId);
      if (imei) {
        await AsyncStorage.setItem('tracking_imei', imei);
      }

      // Start foreground tracking
      this.startForegroundTracking(userId, deviceId, imei);

      // Start background tracking task
      await this.startBackgroundTracking();

      this.isTracking = true;
      console.log('GPS tracking started');
    } catch (error) {
      console.error('Failed to start tracking:', error);
      throw error;
    }
  }

  private startForegroundTracking(userId: number, deviceId: string, imei?: string) {
    // Poll location every 30 seconds
    this.foregroundTrackingInterval = setInterval(async () => {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const locationData: LocationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? undefined,
          altitude: location.coords.altitude ?? undefined,
          heading: location.coords.heading ?? undefined,
          speed: location.coords.speed ?? undefined,
        };

        // Send to backend
        await workerAPI.updateTracking({
          user_id: userId,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          device_id: deviceId,
          imei,
          accuracy: locationData.accuracy,
        });

        // Call callback if set
        if (this.locationUpdateCallback) {
          this.locationUpdateCallback(locationData);
        }

        this.lastLocationTime = Date.now();
      } catch (error) {
        console.error('Foreground tracking error:', error);
      }
    }, TRACKING_INTERVAL);
  }

  private foregroundTrackingInterval: NodeJS.Timeout | null = null;

  private async startBackgroundTracking() {
    try {
      // Define background task
      TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
        if (error) {
          console.error('Background location error:', error);
          return;
        }

        if (data) {
          const { locations } = data as { locations: Location.LocationObject[] };
          if (locations && locations.length > 0) {
            const location = locations[locations.length - 1];

            try {
              const userId = await AsyncStorage.getItem('tracking_user_id');
              const deviceId = await AsyncStorage.getItem('tracking_device_id');
              const imei = await AsyncStorage.getItem('tracking_imei');

              if (userId && deviceId) {
                await workerAPI.updateTracking({
                  user_id: parseInt(userId),
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  device_id: deviceId,
                  imei: imei || undefined,
                  accuracy: location.coords.accuracy ?? undefined,
                });
              }
            } catch (error) {
              console.error('Background tracking update error:', error);
            }
          }
        }
      });

      // Start background location tracking
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: TRACKING_INTERVAL,
        distanceInterval: 10, // Update if moved 10 meters
        foregroundService: {
          notificationTitle: 'SWM PRO Tracking',
          notificationBody: 'Location tracking in progress',
          notificationColor: '#0ea5e9',
        },
      });

      console.log('Background location tracking started');
    } catch (error) {
      console.error('Failed to start background tracking:', error);
    }
  }

  async stopTracking() {
    try {
      if (this.foregroundTrackingInterval) {
        clearInterval(this.foregroundTrackingInterval);
        this.foregroundTrackingInterval = null;
      }

      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

      await AsyncStorage.removeItem('tracking_user_id');
      await AsyncStorage.removeItem('tracking_device_id');
      await AsyncStorage.removeItem('tracking_imei');

      this.isTracking = false;
      console.log('GPS tracking stopped');
    } catch (error) {
      console.error('Failed to stop tracking:', error);
      throw error;
    }
  }

  async getCurrentLocation(): Promise<LocationData> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
        altitude: location.coords.altitude ?? undefined,
        heading: location.coords.heading ?? undefined,
        speed: location.coords.speed ?? undefined,
      };
    } catch (error) {
      console.error('Failed to get current location:', error);
      throw error;
    }
  }

  setLocationUpdateCallback(callback: (location: LocationData) => void) {
    this.locationUpdateCallback = callback;
  }

  getIsTracking() {
    return this.isTracking;
  }
}

export const gpsTracker = new GPSTracker();
