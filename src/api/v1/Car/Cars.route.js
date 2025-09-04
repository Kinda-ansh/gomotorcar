import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import rbac from '../../../middlewares/rbac.middleware.js';
import { CarsController } from './Cars.controller';

const router = express.Router();

router.get('/', auth, CarsController.getCars);
router.post('/', auth, CarsController.createCar);
router.get('/:id', auth, CarsController.getCar);
router.patch('/:id', auth, CarsController.updateCar);
router.delete('/:id', auth, CarsController.deleteCar);

export default router;



