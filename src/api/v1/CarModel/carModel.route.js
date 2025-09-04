import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import rbac from '../../../middlewares/rbac.middleware.js';
import { CarModelController } from './carModel.controller';

const router = express.Router();

router.get('/', auth,  CarModelController.getCarModels);
router.post('/', auth,  CarModelController.createCarModel);
router.get('/:id', auth,  CarModelController.getCarModel);
router.patch('/:id', auth, CarModelController.updateCarModel);
router.delete('/:id', auth, CarModelController.deleteCarModel);

export default router;


