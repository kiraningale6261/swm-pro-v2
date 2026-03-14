-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Location Hierarchy Tables
CREATE TABLE countries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(10) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE states (
  id SERIAL PRIMARY KEY,
  country_id INT NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(country_id, name)
);

CREATE TABLE districts (
  id SERIAL PRIMARY KEY,
  state_id INT NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(state_id, name)
);

CREATE TABLE talukas (
  id SERIAL PRIMARY KEY,
  district_id INT NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(district_id, name)
);

CREATE TABLE villages (
  id SERIAL PRIMARY KEY,
  taluka_id INT NOT NULL REFERENCES talukas(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(10),
  boundary GEOMETRY(Polygon, 4326),
  area_sq_km DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(taluka_id, name)
);

CREATE INDEX idx_villages_boundary ON villages USING GIST(boundary);

-- Ward Tables
CREATE TABLE wards (
  id SERIAL PRIMARY KEY,
  village_id INT NOT NULL REFERENCES villages(id) ON DELETE CASCADE,
  ward_number INT NOT NULL,
  boundary GEOMETRY(Polygon, 4326),
  area_sq_km DECIMAL(10, 2),
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(village_id, ward_number)
);

CREATE INDEX idx_wards_boundary ON wards USING GIST(boundary);

-- Users and Authentication
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'worker', -- admin, worker
  pin_hash VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  device_id VARCHAR(255),
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_device_id ON users(device_id);

-- OTP Management
CREATE TABLE otp_records (
  id SERIAL PRIMARY KEY,
  mobile VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_mobile ON otp_records(mobile);
CREATE INDEX idx_otp_expires ON otp_records(expires_at);

-- Sessions
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255),
  token_hash VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);

-- QR Codes
CREATE TABLE qr_codes (
  id SERIAL PRIMARY KEY,
  code_value VARCHAR(255) NOT NULL UNIQUE,
  code_type VARCHAR(50) NOT NULL, -- ward, task_point, checkpoint
  reference_id INT,
  reference_type VARCHAR(50),
  location GEOMETRY(Point, 4326),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_qr_codes_code_value ON qr_codes(code_value);
CREATE INDEX idx_qr_codes_location ON qr_codes USING GIST(location);

-- QR Scans
CREATE TABLE qr_scans (
  id SERIAL PRIMARY KEY,
  qr_code_id INT NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location GEOMETRY(Point, 4326),
  device_id VARCHAR(255),
  accuracy DECIMAL(5, 2),
  scan_type VARCHAR(50), -- start, end, checkpoint
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_qr_scans_qr_code_id ON qr_scans(qr_code_id);
CREATE INDEX idx_qr_scans_user_id ON qr_scans(user_id);
CREATE INDEX idx_qr_scans_created_at ON qr_scans(created_at);

-- Work Assignments
CREATE TABLE work_assignments (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ward_id INT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  module_type VARCHAR(50) NOT NULL, -- door_to_door, road_sweeping, drainage, depot
  status VARCHAR(50) DEFAULT 'assigned', -- assigned, started, completed, cancelled
  scheduled_date DATE NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_work_assignments_user_id ON work_assignments(user_id);
CREATE INDEX idx_work_assignments_ward_id ON work_assignments(ward_id);
CREATE INDEX idx_work_assignments_status ON work_assignments(status);

-- GPS Trails
CREATE TABLE gps_trails (
  id SERIAL PRIMARY KEY,
  work_assignment_id INT NOT NULL REFERENCES work_assignments(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trail GEOMETRY(LineString, 4326),
  distance_meters DECIMAL(10, 2),
  duration_seconds INT,
  start_location GEOMETRY(Point, 4326),
  end_location GEOMETRY(Point, 4326),
  is_valid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gps_trails_work_assignment_id ON gps_trails(work_assignment_id);
CREATE INDEX idx_gps_trails_user_id ON gps_trails(user_id);
CREATE INDEX idx_gps_trails_trail ON gps_trails USING GIST(trail);

-- GPS Points (breadcrumb trail)
CREATE TABLE gps_points (
  id SERIAL PRIMARY KEY,
  gps_trail_id INT NOT NULL REFERENCES gps_trails(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location GEOMETRY(Point, 4326),
  accuracy DECIMAL(5, 2),
  speed DECIMAL(5, 2),
  heading DECIMAL(5, 2),
  is_mock_location BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gps_points_gps_trail_id ON gps_points(gps_trail_id);
CREATE INDEX idx_gps_points_user_id ON gps_points(user_id);
CREATE INDEX idx_gps_points_location ON gps_points USING GIST(location);

-- Drainage Lines
CREATE TABLE drainage_lines (
  id SERIAL PRIMARY KEY,
  ward_id INT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  line_geometry GEOMETRY(LineString, 4326),
  length_meters DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drainage_lines_ward_id ON drainage_lines(ward_id);
CREATE INDEX idx_drainage_lines_geometry ON drainage_lines USING GIST(line_geometry);

-- Drainage Task Completions
CREATE TABLE drainage_completions (
  id SERIAL PRIMARY KEY,
  drainage_line_id INT NOT NULL REFERENCES drainage_lines(id) ON DELETE CASCADE,
  gps_trail_id INT NOT NULL REFERENCES gps_trails(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  overlap_percentage DECIMAL(5, 2),
  is_auto_completed BOOLEAN DEFAULT FALSE,
  completion_timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drainage_completions_drainage_line_id ON drainage_completions(drainage_line_id);
CREATE INDEX idx_drainage_completions_gps_trail_id ON drainage_completions(gps_trail_id);

-- Depots
CREATE TABLE depots (
  id SERIAL PRIMARY KEY,
  ward_id INT REFERENCES wards(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  location GEOMETRY(Point, 4326) NOT NULL,
  radius_meters INT DEFAULT 50,
  trip_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_depots_location ON depots USING GIST(location);

-- Depot Events
CREATE TABLE depot_events (
  id SERIAL PRIMARY KEY,
  depot_id INT NOT NULL REFERENCES depots(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255),
  entry_location GEOMETRY(Point, 4326),
  entry_time TIMESTAMP,
  exit_location GEOMETRY(Point, 4326),
  exit_time TIMESTAMP,
  duration_seconds INT,
  trip_incremented BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_depot_events_depot_id ON depot_events(depot_id);
CREATE INDEX idx_depot_events_user_id ON depot_events(user_id);
CREATE INDEX idx_depot_events_entry_time ON depot_events(entry_time);

-- Photos
CREATE TABLE photos (
  id SERIAL PRIMARY KEY,
  work_assignment_id INT NOT NULL REFERENCES work_assignments(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_url VARCHAR(500) NOT NULL,
  file_key VARCHAR(255),
  file_size INT,
  mime_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_photos_work_assignment_id ON photos(work_assignment_id);
CREATE INDEX idx_photos_user_id ON photos(user_id);

-- Global Configuration
CREATE TABLE config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT,
  data_type VARCHAR(50),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id INT,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Notifications
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  message TEXT,
  notification_type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Create spatial indexes for better performance
CREATE INDEX idx_villages_boundary_idx ON villages USING GIST(boundary);
CREATE INDEX idx_wards_boundary_idx ON wards USING GIST(boundary);
CREATE INDEX idx_drainage_lines_geometry_idx ON drainage_lines USING GIST(line_geometry);
CREATE INDEX idx_depots_location_idx ON depots USING GIST(location);
CREATE INDEX idx_gps_trails_trail_idx ON gps_trails USING GIST(trail);
CREATE INDEX idx_gps_points_location_idx ON gps_points USING GIST(location);
CREATE INDEX idx_qr_codes_location_idx ON qr_codes USING GIST(location);
CREATE INDEX idx_qr_scans_location_idx ON qr_scans USING GIST(location);
CREATE INDEX idx_depot_events_entry_location_idx ON depot_events USING GIST(entry_location);
CREATE INDEX idx_gps_trails_start_location_idx ON gps_trails USING GIST(start_location);
CREATE INDEX idx_gps_trails_end_location_idx ON gps_trails USING GIST(end_location);
