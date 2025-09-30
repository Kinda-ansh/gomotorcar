import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import rbac from '../../../middlewares/rbac.middleware.js';
import { QRCodeController } from './qrcode.controller.js';

const router = express.Router();

// Dashboard route (should come before /:id to avoid conflicts)
router.get('/dashboard', auth, QRCodeController.getQRCodeDashboard);

// CRUD routes for QR code series
router.get('/', auth, QRCodeController.getQRCodeSeries);
router.post('/', auth, QRCodeController.createQRCodeSeries);
router.get('/:id', auth, QRCodeController.getQRCodeSeriesById);
router.patch('/:id', auth, QRCodeController.updateQRCodeSeries);
router.delete('/:id', auth, QRCodeController.deleteQRCodeSeries);

// Routes for managing individual generated codes within a series
router.get('/:id/codes', auth, QRCodeController.getGeneratedCodes);
router.patch('/:id/codes/:serial', auth, QRCodeController.updateGeneratedCode);
router.patch('/:id/codes/bulk-update', auth, QRCodeController.bulkUpdateGeneratedCodes);

// Download and generation routes
router.get('/:id/download', auth, QRCodeController.downloadQRCodes);
router.post('/:id/generate', auth, QRCodeController.generateQRCodeImages);

// Test PDF generation
router.get('/test/pdf', QRCodeController.testPDF);
router.get('/test/qr-pdf', QRCodeController.testQRPDF);

export default router;
