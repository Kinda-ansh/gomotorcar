import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import rbac from '../../../middlewares/rbac.middleware.js';
import { CarCategoryController } from './carCategory.controller';

const router = express.Router();

router.get('/', auth, CarCategoryController.getCarCategories);
router.post('/', auth, CarCategoryController.createCarCategory);
router.get('/:id', auth, CarCategoryController.getCarCategory);
router.patch('/:id', auth, CarCategoryController.updateCarCategory);
router.delete('/:id', auth, CarCategoryController.deleteCarCategory);

export default router;


