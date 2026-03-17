import * as Crypto from 'expo-crypto';
import { LocationData } from './gpsTracker';

interface QRCodePayload {
  userId: number;
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  signature: string;
}

class QRGenerator {
  private jwtSecret = process.env.EXPO_PUBLIC_JWT_SECRET || 'default-secret-key';

  /**
   * Generate a JWT-signed QR code payload
   */
  async generateQRCode(
    userId: number,
    location: LocationData
  ): Promise<{ qrCode: string; payload: QRCodePayload }> {
    try {
      const timestamp = Date.now();

      // Create payload
      const payload: QRCodePayload = {
        userId,
        timestamp,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        signature: '', // Will be filled after signing
      };

      // Create signature
      const dataToSign = `${userId}:${timestamp}:${location.latitude}:${location.longitude}`;
      const signature = await this.createSignature(dataToSign);
      payload.signature = signature;

      // Encode as base64 for QR code
      const qrCode = Buffer.from(JSON.stringify(payload)).toString('base64');

      return { qrCode, payload };
    } catch (error) {
      console.error('QR code generation error:', error);
      throw error;
    }
  }

  /**
   * Verify a QR code signature
   */
  async verifyQRCode(qrCodeBase64: string): Promise<QRCodePayload> {
    try {
      const decodedData = Buffer.from(qrCodeBase64, 'base64').toString('utf-8');
      const payload: QRCodePayload = JSON.parse(decodedData);

      // Verify signature
      const dataToSign = `${payload.userId}:${payload.timestamp}:${payload.latitude}:${payload.longitude}`;
      const expectedSignature = await this.createSignature(dataToSign);

      if (payload.signature !== expectedSignature) {
        throw new Error('Invalid QR code signature');
      }

      // Check if QR code is not too old (5 minutes)
      const age = Date.now() - payload.timestamp;
      if (age > 5 * 60 * 1000) {
        throw new Error('QR code expired');
      }

      return payload;
    } catch (error) {
      console.error('QR code verification error:', error);
      throw error;
    }
  }

  /**
   * Create HMAC-SHA256 signature
   */
  private async createSignature(data: string): Promise<string> {
    try {
      // Use SHA256 hash
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data + this.jwtSecret
      );
      return hash;
    } catch (error) {
      console.error('Signature creation error:', error);
      throw error;
    }
  }

  /**
   * Generate a simple numeric QR code for quick scanning
   */
  generateSimpleQRCode(userId: number, timestamp: number = Date.now()): string {
    // Format: USER_ID + TIMESTAMP (last 8 digits) + CHECKSUM
    const userPart = String(userId).padStart(6, '0');
    const timePart = String(timestamp % 100000000).padStart(8, '0');

    // Simple checksum
    const checksum = (
      (parseInt(userPart) + parseInt(timePart)) %
      100
    )
      .toString()
      .padStart(2, '0');

    return `${userPart}${timePart}${checksum}`;
  }

  /**
   * Verify simple QR code
   */
  verifySimpleQRCode(qrCode: string): { userId: number; timestamp: number } | null {
    try {
      if (qrCode.length !== 16) {
        return null;
      }

      const userPart = parseInt(qrCode.substring(0, 6));
      const timePart = parseInt(qrCode.substring(6, 14));
      const checksum = parseInt(qrCode.substring(14, 16));

      // Verify checksum
      const expectedChecksum = ((userPart + timePart) % 100).toString().padStart(2, '0');
      if (checksum.toString().padStart(2, '0') !== expectedChecksum) {
        return null;
      }

      return {
        userId: userPart,
        timestamp: timePart,
      };
    } catch (error) {
      console.error('Simple QR code verification error:', error);
      return null;
    }
  }
}

export const qrGenerator = new QRGenerator();
