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

type ScanMode = 'create' | 'scan';

export default function HomeScreenUpdated() {
  const { user, logout } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('create');
  const [proximityMessage, setProximityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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
        setProximityMessage({
          type: 'success',
          text: 'GPS tracking started. Updates sent every 30 seconds.',
        });
      } else {
        // Stop tracking
        await gpsTracker.stopTracking();
        setIsTracking(false);
        setProximityMessage(null);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to toggle tracking');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQRPoint = async () => {
    try {
      setLoading(true);

      // Get current location
      const location = await gpsTracker.getCurrentLocation();

      if (!user) throw new Error('User not authenticated');

      // Call backend to create QR point with duplicate prevention and proximity check
      const response = await workerAPI.generateQRCode(user.id, location);

      // Generate JWT-signed QR code
      const { qrCode } = await qrGenerator.generateQRCode(user.id, location);

      setGeneratedQR(qrCode);
      setProximityMessage({
        type: 'success',
        text: `✓ QR Point Created! Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
      });
    } catch (error: any) {
      setProximityMessage({
        type: 'error',
        text: error.message || 'Failed to create QR point',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScanQRPoint = async () => {
    try {
      setLoading(true);

      // Get current location
      const location = await gpsTracker.getCurrentLocation();

      if (!user) throw new Error('User not authenticated');

      // In a real app, you would use a camera to scan the QR code
      // For now, we'll simulate scanning with a prompt
      Alert.prompt(
        'Scan QR Code',
        'Enter the QR code value:',
        [
          {
            text: 'Cancel',
            onPress: () => setLoading(false),
            style: 'cancel',
          },
          {
            text: 'Scan',
            onPress: async (qrCodeValue) => {
              try {
                // Call backend to verify proximity and record scan
                const response = await workerAPI.scanQRCode(user.id, qrCodeValue, location);

                setProximityMessage({
                  type: 'success',
                  text: `✓ QR Code Scanned Successfully! Worker verified at location.`,
                });
              } catch (error: any) {
                setProximityMessage({
                  type: 'error',
                  text: error.message || 'Failed to scan QR code',
                });
              } finally {
                setLoading(false);
              }
            },
          },
        ],
        'plain-text'
      );
    } catch (error: any) {
      setProximityMessage({
        type: 'error',
        text: error.message || 'Failed to scan QR point',
      });
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

      {/* Proximity Message */}
      {proximityMessage && (
        <View style={[styles.messageBox, proximityMessage.type === 'error' ? styles.messageError : styles.messageSuccess]}>
          <Text style={styles.messageText}>{proximityMessage.text}</Text>
        </View>
      )}

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

      {/* QR Mode Toggle */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>QR Mode</Text>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, scanMode === 'create' && styles.modeButtonActive]}
            onPress={() => setScanMode('create')}
          >
            <Text style={[styles.modeButtonText, scanMode === 'create' && styles.modeButtonTextActive]}>
              Create Point
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, scanMode === 'scan' && styles.modeButtonActive]}
            onPress={() => setScanMode('scan')}
          >
            <Text style={[styles.modeButtonText, scanMode === 'scan' && styles.modeButtonTextActive]}>
              Scan Point
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Create QR Point Card */}
      {scanMode === 'create' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create QR Point</Text>
          <Text style={styles.cardDescription}>
            Generate a new QR point at your current location. Duplicate prevention: If a point exists within 15m, it will be reused.
          </Text>

          {generatedQR ? (
            <View style={styles.qrContainer}>
              <View style={styles.qrBox}>
                <Text style={styles.qrLabel}>QR Code (Base64)</Text>
                <Text style={styles.qrCode} numberOfLines={3}>
                  {generatedQR.substring(0, 50)}...
                </Text>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
            onPress={handleCreateQRPoint}
            disabled={loading || !currentLocation}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create QR Point</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Scan QR Point Card */}
      {scanMode === 'scan' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Scan QR Point</Text>
          <Text style={styles.cardDescription}>
            Scan a QR point created by your supervisor. Your location must be within 5 meters to successfully scan.
          </Text>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, loading && styles.buttonDisabled]}
            onPress={handleScanQRPoint}
            disabled={loading || !currentLocation}
          >
            {loading ? (
              <ActivityIndicator color="#0ea5e9" />
            ) : (
              <Text style={styles.buttonTextSecondary}>Scan QR Code</Text>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>5m Proximity Check</Text>
            <Text style={styles.infoText}>
              • You must be within 5 meters of the QR point to scan{'\n'}
              • Your GPS accuracy must be good (ideally &lt;10m){'\n'}
              • If too far, you'll see: "Too Far! Move within 5m"
            </Text>
          </View>
        </View>
      )}

      {/* Session Stats */}
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
  messageBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  messageSuccess: {
    backgroundColor: '#dcfce7',
    borderLeftColor: '#22c55e',
  },
  messageError: {
    backgroundColor: '#fee2e2',
    borderLeftColor: '#ef4444',
  },
  messageText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
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
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  modeButtonActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  button: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonPrimary: {
    backgroundColor: '#0ea5e9',
  },
  buttonSecondary: {
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#0ea5e9',
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
    marginTop: 12,
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
