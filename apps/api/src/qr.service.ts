import { createClient } from '@supabase/supabase-js';
// Define missing types and enums locally
type QRCodeType = 'ward' | 'task_point' | 'checkpoint';

const SWM_QR_CODE_STATUS = {
  PENDING: 'pending',
  SCANNED: 'scanned'
};

const SWM_QR_CODE_TYPE: Record<string, QRCodeType> = {
  CHECKPOINT: 'checkpoint'
};

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

const PROXIMITY_THRESHOLD_METERS = 5; // 5 meters
const DUPLICATE_POINT_RADIUS_METERS = 15; // 15 meters
const RESET_INTERVAL_HOURS = 14; // 14 hours

export const qrService = {
  /**
   * Scans a QR code and performs a 5m proximity check.
   * @param workerId The ID of the worker scanning the QR code.
   * @param qrCodeValue The value of the QR code being scanned.
   * @param scanLocation The GPS location of the worker at the time of scan.
   * @returns The scanned QR code record if successful.
   * @throws Error if worker is too far or QR code is invalid/expired.
   */
  async scanQRCode(
    workerId: number,
    qrCodeValue: string,
    scanLocation: { latitude: number; longitude: number }
  ) {
    // 1. Fetch QR code details
    const { data: qrCode, error: qrError } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('code_value', qrCodeValue)
      .single();

    if (qrError || !qrCode) {
      throw new Error('Invalid or expired QR code.');
    }

    // 2. 5m Proximity Check (ST_DistanceSphere)
    const { data: distanceData, error: distanceError } = await supabase.rpc(
      'get_distance_sphere',
      {
        lat1: scanLocation.latitude,
        lon1: scanLocation.longitude,
        lat2: qrCode.location.coordinates[1],
        lon2: qrCode.location.coordinates[0],
      }
    );

    if (distanceError) {
      console.error('Error calculating distance:', distanceError);
      throw new Error('Failed to verify proximity.');
    }

    if (distanceData > PROXIMITY_THRESHOLD_METERS) {
      throw new Error(`Too Far! Move within ${PROXIMITY_THRESHOLD_METERS}m.`);
    }

    // 3. Record the scan
    const { data: scanRecord, error: scanError } = await supabase
      .from('qr_scans')
      .insert({
        qr_code_id: qrCode.id,
        user_id: workerId,
        location: `POINT(${scanLocation.longitude} ${scanLocation.latitude})`,
        device_id: 'worker-app',
        scan_type: SWM_QR_CODE_TYPE.CHECKPOINT,
      })
      .select()
      .single();

    if (scanError) {
      console.error('Error recording QR scan:', scanError);
      throw new Error('Failed to record QR scan.');
    }

    // 4. Update QR code status to 'scanned' if it was 'pending'
    if (qrCode.status === SWM_QR_CODE_STATUS.PENDING) {
      await supabase
        .from('qr_codes')
        .update({ status: SWM_QR_CODE_STATUS.SCANNED, scanned_at: new Date().toISOString() })
        .eq('id', qrCode.id);
    }

    return scanRecord;
  },

  /**
   * Creates a new QR point or reuses an existing one within 15m radius.
   * @param userId The ID of the user creating the point.
   * @param location The GPS location for the new point.
   * @returns The created or reused QR code record.
   */
  async createQRCode(
    userId: number,
    location: { latitude: number; longitude: number }
  ) {
    // 1. Check for existing points within 15m radius
    const { data: existingPoints, error: searchError } = await supabase.rpc(
      'get_nearby_qr_codes',
      {
        lat: location.latitude,
        lon: location.longitude,
        radius_meters: DUPLICATE_POINT_RADIUS_METERS,
      }
    );

    if (searchError) {
      console.error('Error searching for nearby QR codes:', searchError);
      throw new Error('Failed to check for nearby points.');
    }

    if (existingPoints && existingPoints.length > 0) {
      // Reuse the closest existing point
      const closestPoint = existingPoints[0];
      console.log(`Reusing existing QR code: ${closestPoint.code_value}`);
      return closestPoint;
    }

    // 2. Create a new QR code point
    const codeValue = `QR-${userId}-${Date.now()}`;
    const { data: newQrCode, error: createError } = await supabase
      .from('qr_codes')
      .insert({
        code_value: codeValue,
        code_type: SWM_QR_CODE_TYPE.CHECKPOINT,
        location: `POINT(${location.longitude} ${location.latitude})`,
        created_by: userId,
        status: SWM_QR_CODE_STATUS.PENDING,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating QR code:', createError);
      throw new Error('Failed to create QR code.');
    }

    return newQrCode;
  },

  /**
   * Resets the status of QR codes to 'pending' if they haven't been scanned for 14 hours.
   * This function should be called periodically (e.g., via a cron job).
   */
  async resetOldQRCodes() {
    const fourteenHoursAgo = new Date(Date.now() - RESET_INTERVAL_HOURS * 3600 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('qr_codes')
      .update({ status: SWM_QR_CODE_STATUS.PENDING, scanned_at: null })
      .eq('status', SWM_QR_CODE_STATUS.SCANNED)
      .lt('scanned_at', fourteenHoursAgo);

    if (error) {
      console.error('Error resetting old QR codes:', error);
      throw new Error('Failed to reset old QR codes.');
    }

    const count = (data as any[])?.length || 0;
    console.log(`Reset ${count} QR codes to pending status.`);
    return data;
  },
};

