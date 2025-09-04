import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import { RiverController } from './river.controller';

const router = express.Router();

router.get('/', auth, RiverController.getRivers);
router.post('/', auth, RiverController.createRiver);
router.get('/:id', auth, RiverController.getRiver);
router.patch('/:id', auth, RiverController.updateRiver);
router.delete('/:id', auth, RiverController.deleteRiver);

export default router;
