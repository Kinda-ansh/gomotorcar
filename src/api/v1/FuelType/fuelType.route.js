import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import rbac from '../../../middlewares/rbac.middleware.js';
import { FuelTypeController } from './fuelType.controller';

const router = express.Router();

router.get('/', auth, FuelTypeController.getFuelTypes);
router.post('/', auth, FuelTypeController.createFuelType);
router.get('/:id', auth, FuelTypeController.getFuelType);
router.patch('/:id', auth, FuelTypeController.updateFuelType);
router.delete('/:id', auth, FuelTypeController.deleteFuelType);

export default router;


