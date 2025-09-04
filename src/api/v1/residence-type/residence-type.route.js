import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import rbac from '../../../middlewares/rbac.middleware.js';
import { ResidenceTypeController } from './residence-type.controller';

const router = express.Router();

router.get('/', auth, ResidenceTypeController.getResidenceTypes);
router.post('/', auth, ResidenceTypeController.createResidenceType);
router.get('/:id', auth, ResidenceTypeController.getResidenceType);
router.patch('/:id', auth, ResidenceTypeController.updateResidenceType);
router.delete('/:id', auth, ResidenceTypeController.deleteResidenceType);

export default router;
