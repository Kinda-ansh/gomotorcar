import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import { CarRegistrationTypeController } from './carRegistrationType.controller';

const router = express.Router();

router.get('/', auth, CarRegistrationTypeController.getCarRegistrationTypes);
router.post('/', auth, CarRegistrationTypeController.createCarRegistrationType);
router.get('/:id', auth, CarRegistrationTypeController.getCarRegistrationType);
router.patch('/:id', auth, CarRegistrationTypeController.updateCarRegistrationType);
router.delete('/:id', auth, CarRegistrationTypeController.deleteCarRegistrationType);

export default router;


