import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import rbac from '../../../middlewares/rbac.middleware.js';
import { QRCodeController } from './qrcode.controller.js';

const router = express.Router();

// QR Code operations
router.get('/', auth, QRCodeController.getGeneratedQRCodes);
router.post('/generate-qr', auth, QRCodeController.generateQRCodes);
router.post('/print-qr', auth, QRCodeController.printQRCodes);

export default router;
