import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import rbac from '../../../middlewares/rbac.middleware.js';
import { BrandController } from './brand.controller';

const router = express.Router();

router.get('/', auth, BrandController.getBrands);
router.post('/', auth, BrandController.createBrand);
router.get('/:id', auth, BrandController.getBrand);
router.patch('/:id', auth, BrandController.updateBrand);
router.delete('/:id', auth, BrandController.deleteBrand);

export default router;


