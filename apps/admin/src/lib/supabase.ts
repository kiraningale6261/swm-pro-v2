import { createClient } from '@supabase/supabase-js';

// Environment variables ko fetch kar rahe hain
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// Admin operations ke liye service role key (Railway settings mein check karein)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; 

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check Railway/Environment settings.');
}

// Agar service key milti hai toh use use karein taaki RLS policies bypass ho sakein
// Dashboard ke liye ye best hai kyunki humein saara data dikhana hota hai
export const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

// Helper functions for common operations
export const supabaseAdmin = {
  // --- NEW: HIERARCHY SECTION (Missing previously) ---
  async getHierarchy(level: string) {
    const table = level.toLowerCase() + 's'; // e.g., 'villages', 'districts'
    const { data, error } = await supabase.from(table).select('*').order('name');
    if (error) throw error;
    return data || [];
  },

  async createHierarchyItem(level: string, item: any) {
    const table = level.toLowerCase() + 's';
    const { data, error } = await supabase.from(table).insert([item]).select();
    if (error) throw error;
    return data?.[0];
  },

  async deleteHierarchyItem(level: string, id: number) {
    const table = level.toLowerCase() + 's';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // --- USERS SECTION ---
  async getUsers() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data || [];
  },

  async getUserById(id: number) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async createUser(user: any) {
    const { data, error } = await supabase.from('users').insert([user]).select();
    if (error) throw error;
    return data?.[0];
  },

  async updateUser(id: number, updates: any) {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select();
    if (error) throw error;
    return data?.[0];
  },

  // --- WARDS SECTION ---
  async getWards() {
    const { data, error } = await supabase.from('wards').select('*').order('ward_number', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getWardById(id: number) {
    const { data, error } = await supabase.from('wards').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  // --- WORK ASSIGNMENTS SECTION ---
  async getWorkAssignments() {
    const { data, error } = await supabase
      .from('work_assignments')
      .select('*, users(name, mobile), wards(ward_number)');
    if (error) throw error;
    return data || [];
  },

  async createWorkAssignment(assignment: any) {
    const { data, error } = await supabase.from('work_assignments').insert([assignment]).select();
    if (error) throw error;
    return data?.[0];
  },

  // --- QR CODES SECTION ---
  async getQRCodes() {
    const { data, error } = await supabase.from('qr_codes').select('*');
    if (error) throw error;
    return data || [];
  },

  async createQRCode(qrCode: any) {
    const { data, error } = await supabase.from('qr_codes').insert([qrCode]).select();
    if (error) throw error;
    return data?.[0];
  },

  async updateQRCode(id: number, updates: any) {
    const { data, error } = await supabase.from('qr_codes').update(updates).eq('id', id).select();
    if (error) throw error;
    return data?.[0];
  },

  // --- GPS TRAILS SECTION ---
  async getGPSTrails() {
    const { data, error } = await supabase.from('gps_trails').select('*');
    if (error) throw error;
    return data || [];
  },

  async getGPSTrailsByWorkAssignment(workAssignmentId: number) {
    const { data, error } = await supabase
      .from('gps_trails')
      .select('*')
      .eq('work_assignment_id', workAssignmentId);
    if (error) throw error;
    return data || [];
  },

  // --- GPS POINTS SECTION ---
  async getGPSPoints(gpsTrailId: number) {
    const { data, error } = await supabase
      .from('gps_points')
      .select('*')
      .eq('gps_trail_id', gpsTrailId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
};
