import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import rbac from '../../../middlewares/rbac.middleware.js';
import { QRCodeSeriesController } from './qrcode-series.controller.js';

const router = express.Router();

// CRUD routes for QR code series
router.get('/', auth, QRCodeSeriesController.getQRCodeSeries);
router.post('/', auth, QRCodeSeriesController.createQRCodeSeries);
router.get('/:id', auth, QRCodeSeriesController.getQRCodeSeriesById);
router.patch('/:id', auth, QRCodeSeriesController.updateQRCodeSeries);
router.delete('/:id', auth, QRCodeSeriesController.deleteQRCodeSeries);

export default router;
