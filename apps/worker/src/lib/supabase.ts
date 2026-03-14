import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const supabaseWorker = {
  // Auth
  async sendOTP(mobile: string) {
    const { data, error } = await supabase
      .from('otp_records')
      .insert([
        {
          mobile,
          otp_code: Math.floor(100000 + Math.random() * 900000).toString(),
          is_verified: false,
          attempts: 0,
          expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
        },
      ])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async verifyOTP(mobile: string, otpCode: string) {
    const { data, error } = await supabase
      .from('otp_records')
      .select('*')
      .eq('mobile', mobile)
      .eq('otp_code', otpCode)
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) throw error;
    if (!data) throw new Error('Invalid or expired OTP');

    // Mark as verified
    await supabase.from('otp_records').update({ is_verified: true }).eq('id', data.id);

    return data;
  },

  async getOrCreateUser(mobile: string, name: string) {
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('mobile', mobile)
      .single();

    if (error && error.code === 'PGRST116') {
      // User doesn't exist, create one
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            mobile,
            name,
            role: 'worker',
            is_active: true,
          },
        ])
        .select()
        .single();

      if (createError) throw createError;
      user = newUser;
    } else if (error) {
      throw error;
    }

    return user;
  },

  // GPS Tracking
  async updateGPSLocation(userId: number, location: { latitude: number; longitude: number; imei?: string; deviceId?: string }) {
    const { data, error } = await supabase
      .from('gps_points')
      .insert([
        {
          user_id: userId,
          location: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude],
          },
          accuracy: 5,
          speed: 0,
          heading: 0,
          is_mock_location: false,
        },
      ])
      .select();

    if (error) throw error;
    return data?.[0];
  },

  // QR Codes
  async createQRCode(userId: number, location: { latitude: number; longitude: number }) {
    const codeValue = `QR-${userId}-${Date.now()}`;
    const { data, error } = await supabase
      .from('qr_codes')
      .insert([
        {
          code_value: codeValue,
          code_type: 'task_point',
          location: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude],
          },
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async recordQRScan(userId: number, qrCodeId: number, location: { latitude: number; longitude: number }) {
    const { data, error } = await supabase
      .from('qr_scans')
      .insert([
        {
          qr_code_id: qrCodeId,
          user_id: userId,
          location: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude],
          },
          device_id: 'mobile-worker',
          accuracy: 5,
          scan_type: 'checkpoint',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Work Assignments
  async getWorkAssignments(userId: number) {
    const { data, error } = await supabase
      .from('work_assignments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'assigned');

    if (error) throw error;
    return data;
  },

  async updateAssignmentStatus(assignmentId: number, status: string) {
    const { data, error } = await supabase
      .from('work_assignments')
      .update({ status })
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
