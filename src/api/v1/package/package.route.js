import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import rbac from '../../../middlewares/rbac.middleware.js';
import { PackageController } from './package.controller';

const router = express.Router();

// Main CRUD routes
router.get('/', auth, PackageController.getPackages);
router.post('/', auth, PackageController.createPackage);
router.get('/:id', auth, PackageController.getPackage);
router.patch('/:id', auth, PackageController.updatePackage);
router.delete('/:id', auth, PackageController.deletePackage);

// Approval routes
router.patch('/:id/approve', auth, PackageController.approvePackage);
router.patch('/:id/reject', auth, PackageController.rejectPackage);
router.get('/approval-status/:status', auth, PackageController.getPackagesByApprovalStatus);

// Additional utility routes
router.get('/cluster/:clusterId', auth, PackageController.getPackagesByCluster);
router.get('/car-category/:carCategoryId', auth, PackageController.getPackagesByCarCategory);

// Category pricing routes
router.get('/category-pricing/all', auth, PackageController.getAllCategoryPricing);

export default router;

