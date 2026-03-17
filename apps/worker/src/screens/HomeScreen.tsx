import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Dimensions,
} from 'react-native';
import { useAuth } from '@/lib/authContext';
import { gpsTracker, LocationData } from '@/services/gpsTracker';
import { qrGenerator } from '@/services/qrGenerator';
import { workerAPI } from '@/lib/api';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [trackingStats, setTrackingStats] = useState({
    distance: 0,
    duration: 0,
    points: 0,
  });

  useEffect(() => {
    initializeGPS();
  }, []);

  const initializeGPS = async () => {
    try {
      await gpsTracker.initialize();
      gpsTracker.setLocationUpdateCallback((location) => {
        setCurrentLocation(location);
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to initialize GPS: ' + error.message);
    }
  };

  const handleToggleTracking = async () => {
    try {
      if (!isTracking) {
        setLoading(true);
        if (!user) throw new Error('User not authenticated');

        // Start tracking
        await gpsTracker.startTracking(user.id, 'mobile-worker', user.device_id);
        setIsTracking(true);
        Alert.alert('Success', 'GPS tracking started. Updates sent every 30 seconds.');
      } else {
        // Stop tracking
        await gpsTracker.stopTracking();
        setIsTracking(false);
        Alert.alert('Success', 'GPS tracking stopped.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to toggle tracking');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    try {
      setLoading(true);

      // Get current location
      const location = await gpsTracker.getCurrentLocation();

      if (!user) throw new Error('User not authenticated');

      // Generate JWT-signed QR code
      const { qrCode, payload } = await qrGenerator.generateQRCode(user.id, location);

      // Also create in backend
      await workerAPI.generateQRCode(user.id, location);

      setGeneratedQR(qrCode);
      Alert.alert('QR Code Generated', `Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (isTracking) {
        await gpsTracker.stopTracking();
      }
      await logout();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to logout');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome, {user?.name}</Text>
          <Text style={styles.subtext}>Worker ID: {user?.id}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tracking Status Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>GPS Tracking</Text>
          <View style={[styles.statusBadge, isTracking && styles.statusActive]}>
            <Text style={styles.statusText}>{isTracking ? 'ACTIVE' : 'INACTIVE'}</Text>
          </View>
        </View>

        <View style={styles.trackingInfo}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Latitude</Text>
            <Text style={styles.infoValue}>{currentLocation?.latitude.toFixed(6) || '--'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Longitude</Text>
            <Text style={styles.infoValue}>{currentLocation?.longitude.toFixed(6) || '--'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Accuracy</Text>
            <Text style={styles.infoValue}>{currentLocation?.accuracy?.toFixed(1) || '--'}m</Text>
          </View>
        </View>

        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>{isTracking ? 'Stop Tracking' : 'Start Tracking'}</Text>
          <Switch
            value={isTracking}
            onValueChange={handleToggleTracking}
            disabled={loading}
            trackColor={{ false: '#ccc', true: '#81c784' }}
            thumbColor={isTracking ? '#4caf50' : '#f1f1f1'}
          />
        </View>
      </View>

      {/* QR Code Generation Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Generate QR Code</Text>
        <Text style={styles.cardDescription}>Create a JWT-signed QR code at your current location</Text>

        {generatedQR ? (
          <View style={styles.qrContainer}>
            <View style={styles.qrBox}>
              <Text style={styles.qrLabel}>QR Code (Base64)</Text>
              <Text style={styles.qrCode} numberOfLines={3}>
                {generatedQR.substring(0, 50)}...
              </Text>
            </View>
            <TouchableOpacity style={styles.copyButton}>
              <Text style={styles.copyButtonText}>Copy QR Code</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGenerateQR}
          disabled={loading || !currentLocation}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Generate QR Code</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Tracking Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Session Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{trackingStats.points}</Text>
            <Text style={styles.statLabel}>GPS Points</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{trackingStats.distance}m</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.floor(trackingStats.duration / 60)}m</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
        </View>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>How It Works</Text>
        <Text style={styles.infoText}>
          1. Toggle GPS tracking to start sending location updates{'\n'}
          2. Updates are sent every 30 seconds, even when app is minimized{'\n'}
          3. Generate QR codes with your current GPS coordinates{'\n'}
          4. Supervisor scans the QR code to verify your location
        </Text>
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cardDescription: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991b1b',
  },
  trackingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  button: {
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  qrContainer: {
    marginBottom: 12,
  },
  qrBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  qrLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  qrCode: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#333',
    lineHeight: 16,
  },
  copyButton: {
    backgroundColor: '#e0f2fe',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0ea5e9',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#0c3d66',
    lineHeight: 18,
  },
  spacer: {
    height: 20,
  },
});
