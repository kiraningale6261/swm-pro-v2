import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Add token to requests
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const workerAPI = {
  // Auth endpoints
  async sendOTP(mobile: string) {
    try {
      const response = await apiClient.post('/auth/send-otp', { mobile });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  async verifyOTP(mobile: string, otpCode: string) {
    try {
      const response = await apiClient.post('/auth/verify-otp', { mobile, otp_code: otpCode });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  async setPIN(userId: number, pin: string) {
    try {
      const response = await apiClient.post('/auth/set-pin', { user_id: userId, pin });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  async verifyPIN(userId: number, pin: string) {
    try {
      const response = await apiClient.post('/auth/verify-pin', { user_id: userId, pin });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Tracking endpoints
  async updateTracking(data: {
    user_id: number;
    latitude: number;
    longitude: number;
    imei?: string;
    device_id?: string;
    accuracy?: number;
  }) {
    try {
      const response = await apiClient.post('/tracking/update', data);
      return response.data;
    } catch (error: any) {
      console.error('Tracking update error:', error);
      // Don't throw, just log - tracking should be resilient
      return null;
    }
  },

  // QR Code endpoints
  async generateQRCode(userId: number, location: { latitude: number; longitude: number }) {
    try {
      const response = await apiClient.post('/qr/generate', { user_id: userId, location });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  async scanQRCode(userId: number, qrCode: string, location: { latitude: number; longitude: number }) {
    try {
      const response = await apiClient.post('/qr/scan', { user_id: userId, qr_code: qrCode, location });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Work Assignment endpoints
  async getAssignments(userId: number) {
    try {
      const response = await apiClient.get(`/assignments?user_id=${userId}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  async updateAssignmentStatus(assignmentId: number, status: string) {
    try {
      const response = await apiClient.put(`/assignments/${assignmentId}`, { status });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Device info
  async registerDevice(userId: number, deviceInfo: { imei: string; device_id: string; platform: string }) {
    try {
      const response = await apiClient.post('/device/register', { user_id: userId, ...deviceInfo });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },
};

export default apiClient;
