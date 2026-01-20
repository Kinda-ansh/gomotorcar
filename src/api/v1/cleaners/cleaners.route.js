import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import { CleanerController } from './cleaners.controller.js';

const router = express.Router();

// Cleaner CRUD routes
router.get('/', auth, CleanerController.getCleaners);
router.post('/', auth, CleanerController.createCleaner);
router.get('/:id', auth, CleanerController.getCleaner);
router.patch('/:id', auth, CleanerController.updateCleaner);
router.delete('/:id', auth, CleanerController.deleteCleaner);

// Approval workflow route
router.patch('/:id/approval', auth, CleanerController.updateApprovalStatus);

export default router;
