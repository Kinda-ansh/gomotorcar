import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import rbac from '../../../middlewares/rbac.middleware.js';
import { ScheduleController } from './schedule.controller.js';

const router = express.Router();
router.get('/', auth, ScheduleController.getSchedules);

router.post('/', auth, ScheduleController.createSchedule);
router.get('/:id', auth, ScheduleController.getSchedule);
router.patch('/:id', auth, ScheduleController.updateSchedule);
router.delete('/:id', auth, ScheduleController.deleteSchedule);

export default router;


