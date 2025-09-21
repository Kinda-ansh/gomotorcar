import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import rbac from '../../../middlewares/rbac.middleware.js';
import { GettingstartedController } from './getting-started.controller.js';

const router = express.Router();
router.get('/', auth, GettingstartedController.getGettingstartedList);

router.post('/', auth, GettingstartedController.createGettingstarted);

router.get('/:id', auth, GettingstartedController.getGettingstarted);

router.patch('/:id', auth, GettingstartedController.updateGettingstarted);

router.delete('/:id', auth, GettingstartedController.deleteGettingstarted);
export default router;

