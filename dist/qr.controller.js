import { qrService } from './qr.service.js';
export const qrController = {
    /**
     * POST /qr/scan
     * Scan a QR code with 5m proximity check
     */
    async scanQRCode(req, res) {
        try {
            const { user_id, qr_code, location } = req.body;
            if (!user_id || !qr_code || !location) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: user_id, qr_code, location',
                });
            }
            const scanRecord = await qrService.scanQRCode(user_id, qr_code, location);
            return res.status(200).json({
                success: true,
                message: 'QR code scanned successfully',
                data: scanRecord,
            });
        }
        catch (error) {
            console.error('QR scan error:', error);
            return res.status(400).json({
                success: false,
                error: error.message || 'Failed to scan QR code',
            });
        }
    },
    /**
     * POST /qr/generate
     * Create a new QR code with duplicate prevention (15m radius)
     */
    async createQRCode(req, res) {
        try {
            const { user_id, location } = req.body;
            if (!user_id || !location) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: user_id, location',
                });
            }
            const qrCode = await qrService.createQRCode(user_id, location);
            return res.status(201).json({
                success: true,
                message: 'QR code created or reused successfully',
                data: qrCode,
            });
        }
        catch (error) {
            console.error('QR creation error:', error);
            return res.status(400).json({
                success: false,
                error: error.message || 'Failed to create QR code',
            });
        }
    },
    /**
     * POST /qr/reset
     * Reset old QR codes (14+ hours old) to pending status
     * Should be called periodically via cron job
     */
    async resetOldQRCodes(req, res) {
        try {
            const resetData = await qrService.resetOldQRCodes();
            return res.status(200).json({
                success: true,
                message: 'Old QR codes reset to pending status',
                data: resetData,
            });
        }
        catch (error) {
            console.error('QR reset error:', error);
            return res.status(400).json({
                success: false,
                error: error.message || 'Failed to reset QR codes',
            });
        }
    },
};
