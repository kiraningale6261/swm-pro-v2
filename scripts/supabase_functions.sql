-- Supabase SQL Functions for SWM PRO v2.0 Phase 4

-- 1. Function to calculate distance between two points using ST_DistanceSphere
CREATE OR REPLACE FUNCTION get_distance_sphere(
  lat1 FLOAT,
  lon1 FLOAT,
  lat2 FLOAT,
  lon2 FLOAT
)
RETURNS FLOAT AS $$
BEGIN
  RETURN ST_DistanceSphere(
    ST_MakePoint(lon1, lat1),
    ST_MakePoint(lon2, lat2)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Function to find nearby QR codes within a radius
CREATE OR REPLACE FUNCTION get_nearby_qr_codes(
  lat FLOAT,
  lon FLOAT,
  radius_meters FLOAT DEFAULT 15
)
RETURNS TABLE (
  id BIGINT,
  code_value TEXT,
  code_type TEXT,
  status TEXT,
  location JSONB,
  created_at TIMESTAMP,
  distance FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    qc.id,
    qc.code_value,
    qc.code_type,
    qc.status,
    qc.location,
    qc.created_at,
    ST_DistanceSphere(
      ST_MakePoint(lon, lat),
      ST_MakePoint(
        (qc.location->'coordinates'->0)::FLOAT,
        (qc.location->'coordinates'->1)::FLOAT
      )
    ) AS distance
  FROM public.qr_codes qc
  WHERE
    ST_DWithin(
      ST_MakePoint(lon, lat),
      ST_MakePoint(
        (qc.location->'coordinates'->0)::FLOAT,
        (qc.location->'coordinates'->1)::FLOAT
      ),
      radius_meters
    )
  ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Function to reset old QR codes (14+ hours)
CREATE OR REPLACE FUNCTION reset_old_qr_codes()
RETURNS TABLE (
  id BIGINT,
  code_value TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.qr_codes
  SET
    status = 'pending',
    scanned_at = NULL
  WHERE
    status = 'scanned'
    AND scanned_at IS NOT NULL
    AND scanned_at < NOW() - INTERVAL '14 hours'
  RETURNING
    public.qr_codes.id,
    public.qr_codes.code_value,
    public.qr_codes.status;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to get active workers with latest GPS location
CREATE OR REPLACE FUNCTION get_active_workers()
RETURNS TABLE (
  id BIGINT,
  name TEXT,
  mobile TEXT,
  latitude FLOAT,
  longitude FLOAT,
  accuracy FLOAT,
  last_update TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.name,
    u.mobile,
    (gp.location->'coordinates'->1)::FLOAT AS latitude,
    (gp.location->'coordinates'->0)::FLOAT AS longitude,
    gp.accuracy,
    gp.created_at AS last_update
  FROM public.users u
  LEFT JOIN LATERAL (
    SELECT * FROM public.gps_points
    WHERE user_id = u.id
    ORDER BY created_at DESC
    LIMIT 1
  ) gp ON TRUE
  WHERE u.role = 'worker' AND u.is_active = TRUE
  ORDER BY gp.created_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Function to get active vehicles with latest GPS location
CREATE OR REPLACE FUNCTION get_active_vehicles()
RETURNS TABLE (
  id BIGINT,
  registration TEXT,
  latitude FLOAT,
  longitude FLOAT,
  accuracy FLOAT,
  last_update TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.registration,
    (gp.location->'coordinates'->1)::FLOAT AS latitude,
    (gp.location->'coordinates'->0)::FLOAT AS longitude,
    gp.accuracy,
    gp.created_at AS last_update
  FROM public.vehicles v
  LEFT JOIN LATERAL (
    SELECT * FROM public.gps_points
    WHERE vehicle_id = v.id
    ORDER BY created_at DESC
    LIMIT 1
  ) gp ON TRUE
  WHERE v.is_active = TRUE
  ORDER BY gp.created_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. Function to get QR code statistics
CREATE OR REPLACE FUNCTION get_qr_statistics()
RETURNS TABLE (
  total_codes BIGINT,
  pending_codes BIGINT,
  scanned_codes BIGINT,
  expired_codes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_codes,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_codes,
    COUNT(*) FILTER (WHERE status = 'scanned')::BIGINT AS scanned_codes,
    COUNT(*) FILTER (WHERE status = 'scanned' AND scanned_at < NOW() - INTERVAL '14 hours')::BIGINT AS expired_codes
  FROM public.qr_codes;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON public.qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_scanned_at ON public.qr_codes(scanned_at);
CREATE INDEX IF NOT EXISTS idx_gps_points_user_id ON public.gps_points(user_id);
CREATE INDEX IF NOT EXISTS idx_gps_points_vehicle_id ON public.gps_points(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_gps_points_created_at ON public.gps_points(created_at);
CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_code_id ON public.qr_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_user_id ON public.qr_scans(user_id);

-- Create GiST index for spatial queries
CREATE INDEX IF NOT EXISTS idx_qr_codes_location ON public.qr_codes USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_gps_points_location ON public.gps_points USING GIST(location);
