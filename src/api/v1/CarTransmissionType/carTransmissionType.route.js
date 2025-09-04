import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import { CarTransmissionTypeController } from './carTransmissionType.controller';

const router = express.Router();

router.get('/', auth, CarTransmissionTypeController.getCarTransmissionTypes);
router.post('/', auth, CarTransmissionTypeController.createCarTransmissionType);
router.get('/:id', auth, CarTransmissionTypeController.getCarTransmissionType);
router.patch('/:id', auth, CarTransmissionTypeController.updateCarTransmissionType);
router.delete('/:id', auth, CarTransmissionTypeController.deleteCarTransmissionType);

export default router;


