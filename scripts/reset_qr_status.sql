-- SQL script to reset QR code status to 'pending' after 14 hours
-- This script should be run periodically (e.g., via a database cron job or a serverless function)

DO $$
DECLARE
    reset_interval_hours INT := 14;
    fourteen_hours_ago TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate the timestamp 14 hours ago
    fourteen_hours_ago := NOW() - (reset_interval_hours || ' hours')::INTERVAL;

    -- Update QR codes that were 'scanned' and haven't been scanned for 14 hours
    UPDATE public.qr_codes
    SET
        status = 'pending',
        scanned_at = NULL
    WHERE
        status = 'scanned' AND scanned_at IS NOT NULL AND scanned_at < fourteen_hours_ago;

    RAISE NOTICE 'Reset QR codes to pending status that were scanned before %', fourteen_hours_ago;
END
$$;
