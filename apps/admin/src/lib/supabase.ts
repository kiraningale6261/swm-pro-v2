import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions for common operations
export const supabaseAdmin = {
  // Users
  async getUsers() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data;
  },

  async getUserById(id: number) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async createUser(user: any) {
    const { data, error } = await supabase.from('users').insert([user]).select();
    if (error) throw error;
    return data[0];
  },

  async updateUser(id: number, updates: any) {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },

  // Wards
  async getWards() {
    const { data, error } = await supabase.from('wards').select('*');
    if (error) throw error;
    return data;
  },

  async getWardById(id: number) {
    const { data, error } = await supabase.from('wards').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  // Work Assignments
  async getWorkAssignments() {
    const { data, error } = await supabase
      .from('work_assignments')
      .select('*, users(name, mobile), wards(ward_number)');
    if (error) throw error;
    return data;
  },

  async createWorkAssignment(assignment: any) {
    const { data, error } = await supabase.from('work_assignments').insert([assignment]).select();
    if (error) throw error;
    return data[0];
  },

  // QR Codes
  async getQRCodes() {
    const { data, error } = await supabase.from('qr_codes').select('*');
    if (error) throw error;
    return data;
  },

  async createQRCode(qrCode: any) {
    const { data, error } = await supabase.from('qr_codes').insert([qrCode]).select();
    if (error) throw error;
    return data[0];
  },

  async updateQRCode(id: number, updates: any) {
    const { data, error } = await supabase.from('qr_codes').update(updates).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },

  // GPS Trails
  async getGPSTrails() {
    const { data, error } = await supabase.from('gps_trails').select('*');
    if (error) throw error;
    return data;
  },

  async getGPSTrailsByWorkAssignment(workAssignmentId: number) {
    const { data, error } = await supabase
      .from('gps_trails')
      .select('*')
      .eq('work_assignment_id', workAssignmentId);
    if (error) throw error;
    return data;
  },

  // GPS Points
  async getGPSPoints(gpsTrailId: number) {
    const { data, error } = await supabase
      .from('gps_points')
      .select('*')
      .eq('gps_trail_id', gpsTrailId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
};
