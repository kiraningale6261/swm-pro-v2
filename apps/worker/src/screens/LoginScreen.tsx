import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '@/lib/authContext';
import { supabaseWorker } from '@/lib/supabase';

type LoginStep = 'mobile' | 'otp' | 'pin' | 'confirm-pin';

export default function LoginScreen() {
  const { sendOTP, verifyOTP, setPIN, login } = useAuth();
  const [step, setStep] = useState<LoginStep>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    if (!mobile || mobile.length < 10) {
      setError('Please enter a valid mobile number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await sendOTP(mobile);
      setStep('otp');
      Alert.alert('Success', 'OTP sent to your mobile number');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyOTP(mobile, otp);
      setStep('pin');
      Alert.alert('Success', 'OTP verified. Now set your PIN');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPIN = async () => {
    if (!pin || pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await setPIN(pin);
      Alert.alert('Success', 'PIN set successfully. You are now logged in!');
      // Navigation will be handled by the app based on auth state
    } catch (err: any) {
      setError(err.message || 'Failed to set PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>SWM PRO</Text>
          <Text style={styles.subtitle}>Worker App</Text>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.step, step === 'mobile' && styles.stepActive]}>
            <Text style={styles.stepText}>1</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={[styles.step, (step === 'otp' || step === 'pin' || step === 'confirm-pin') && styles.stepActive]}>
            <Text style={styles.stepText}>2</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={[styles.step, (step === 'pin' || step === 'confirm-pin') && styles.stepActive]}>
            <Text style={styles.stepText}>3</Text>
          </View>
        </View>

        {/* Mobile Input */}
        {step === 'mobile' && (
          <View style={styles.formContainer}>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your mobile number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={mobile}
              onChangeText={(text) => {
                setMobile(text);
                setError('');
              }}
              editable={!loading}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* OTP Input */}
        {step === 'otp' && (
          <View style={styles.formContainer}>
            <Text style={styles.label}>Enter OTP</Text>
            <Text style={styles.hint}>OTP sent to {mobile}</Text>
            <TextInput
              style={styles.input}
              placeholder="000000"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={(text) => {
                setOtp(text);
                setError('');
              }}
              editable={!loading}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify OTP</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('mobile')}>
              <Text style={styles.linkText}>Change mobile number</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PIN Input */}
        {step === 'pin' && (
          <View style={styles.formContainer}>
            <Text style={styles.label}>Set Your PIN</Text>
            <Text style={styles.hint}>Create a 4-digit PIN for quick login</Text>
            <TextInput
              style={styles.input}
              placeholder="••••"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              value={pin}
              onChangeText={(text) => {
                setPin(text);
                setError('');
              }}
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm PIN"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              value={confirmPin}
              onChangeText={(text) => {
                setConfirmPin(text);
                setError('');
              }}
              editable={!loading}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSetPIN}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Complete Setup</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Security</Text>
          <Text style={styles.infoText}>
            • Your PIN is stored securely on your device{'\n'}
            • OTP is valid for 10 minutes{'\n'}
            • Never share your PIN with anyone
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0ea5e9',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  step: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    backgroundColor: '#0ea5e9',
  },
  stepText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: '#bae6fd',
    marginHorizontal: 10,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  button: {
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    color: '#0ea5e9',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 8,
  },
  infoBox: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#0c3d66',
    lineHeight: 20,
  },
});
