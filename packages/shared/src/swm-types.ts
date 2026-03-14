// User Types
export type UserRole = 'admin' | 'worker';

export interface User {
  id: number;
  mobile: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  device_id?: string;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

// Location Hierarchy Types
export interface Country {
  id: number;
  name: string;
  code?: string;
  created_at: Date;
  updated_at: Date;
}

export interface State {
  id: number;
  country_id: number;
  name: string;
  code?: string;
  created_at: Date;
  updated_at: Date;
}

export interface District {
  id: number;
  state_id: number;
  name: string;
  code?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Taluka {
  id: number;
  district_id: number;
  name: string;
  code?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Village {
  id: number;
  taluka_id: number;
  name: string;
  code?: string;
  boundary?: GeoJSON;
  area_sq_km?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Ward {
  id: number;
  village_id: number;
  ward_number: number;
  boundary?: GeoJSON;
  area_sq_km?: number;
  version: number;
  created_at: Date;
  updated_at: Date;
}

// GeoJSON Types
export interface GeoJSON {
  type: 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon' | 'Feature' | 'FeatureCollection';
  coordinates?: any[];
  geometry?: GeoJSON;
  properties?: Record<string, any>;
  features?: any[];
  crs?: { type: string; properties: { name: string } };
}

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

// QR Code Types
export type QRCodeType = 'ward' | 'task_point' | 'checkpoint';

export interface QRCode {
  id: number;
  code_value: string;
  code_type: QRCodeType;
  reference_id?: number;
  reference_type?: string;
  location?: GeoPoint;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface QRScan {
  id: number;
  qr_code_id: number;
  user_id: number;
  location?: GeoPoint;
  device_id?: string;
  accuracy?: number;
  scan_type?: 'start' | 'end' | 'checkpoint';
  metadata?: Record<string, any>;
  created_at: Date;
}

// Work Assignment Types
export type ModuleType = 'door_to_door' | 'road_sweeping' | 'drainage' | 'depot';
export type AssignmentStatus = 'assigned' | 'started' | 'completed' | 'cancelled';

export interface WorkAssignment {
  id: number;
  user_id: number;
  ward_id: number;
  module_type: ModuleType;
  status: AssignmentStatus;
  scheduled_date: Date;
  start_time?: Date;
  end_time?: Date;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// GPS Trail Types
export interface GPSTrail {
  id: number;
  work_assignment_id: number;
  user_id: number;
  trail?: GeoLineString;
  distance_meters?: number;
  duration_seconds?: number;
  start_location?: GeoPoint;
  end_location?: GeoPoint;
  is_valid: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GPSPoint {
  id: number;
  gps_trail_id: number;
  user_id: number;
  location?: GeoPoint;
  accuracy?: number;
  speed?: number;
  heading?: number;
  is_mock_location: boolean;
  created_at: Date;
}

// Drainage Types
export interface DrainageLine {
  id: number;
  ward_id: number;
  line_geometry?: GeoLineString;
  length_meters?: number;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: Date;
  updated_at: Date;
}

export interface DrainageCompletion {
  id: number;
  drainage_line_id: number;
  gps_trail_id: number;
  user_id: number;
  overlap_percentage: number;
  is_auto_completed: boolean;
  completion_timestamp?: Date;
  created_at: Date;
}

// Depot Types
export interface Depot {
  id: number;
  ward_id?: number;
  name: string;
  location: GeoPoint;
  radius_meters: number;
  trip_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface DepotEvent {
  id: number;
  depot_id: number;
  user_id: number;
  device_id?: string;
  entry_location?: GeoPoint;
  entry_time?: Date;
  exit_location?: GeoPoint;
  exit_time?: Date;
  duration_seconds?: number;
  trip_incremented: boolean;
  created_at: Date;
}

// Photo Types
export interface Photo {
  id: number;
  work_assignment_id: number;
  user_id: number;
  storage_url: string;
  file_key?: string;
  file_size?: number;
  mime_type?: string;
  created_at: Date;
}

// Authentication Types
export interface OTPRecord {
  id: number;
  mobile: string;
  otp_code: string;
  is_verified: boolean;
  attempts: number;
  expires_at: Date;
  created_at: Date;
}

export interface Session {
  id: number;
  user_id: number;
  device_id?: string;
  token_hash: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  last_activity?: Date;
  expires_at: Date;
  created_at: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Audit Log Types
export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  entity_type?: string;
  entity_id?: number;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

// Notification Types
export interface Notification {
  id: number;
  user_id: number;
  title?: string;
  message: string;
  notification_type?: string;
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: Date;
}

// Configuration Types
export interface Config {
  id: number;
  key: string;
  value?: string;
  data_type?: string;
  updated_at: Date;
}

// Report Types
export interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: number;
  wardId?: number;
  moduleType?: ModuleType;
  status?: AssignmentStatus;
}

export interface ReportData {
  title: string;
  generatedAt: Date;
  filters: ReportFilter;
  data: any[];
  summary?: Record<string, any>;
}

// Swarm View Types
export interface SwarmWorker {
  id: number;
  user_id: number;
  name: string;
  current_location?: GeoPoint;
  trail?: GeoLineString;
  progress_percentage: number;
  status: AssignmentStatus;
}

export interface SwarmView {
  drainage_line_id: number;
  workers: SwarmWorker[];
  merged_trail?: GeoLineString;
  combined_overlap_percentage: number;
  total_coverage_length: number;
}

// Door-to-Door Collection Types
export interface DoorToDoorTask {
  id: number;
  work_assignment_id: number;
  user_id: number;
  ward_id: number;
  status: 'assigned' | 'started' | 'collected' | 'cancelled';
  qr_scan_id?: number;
  photo_id?: number;
  created_at: Date;
  updated_at: Date;
}

// Road Sweeping Types
export interface RoadSweeepingTask {
  id: number;
  work_assignment_id: number;
  user_id: number;
  ward_id: number;
  status: 'assigned' | 'started' | 'completed' | 'cancelled';
  start_qr_scan_id?: number;
  end_qr_scan_id?: number;
  gps_trail_id?: number;
  created_at: Date;
  updated_at: Date;
}
