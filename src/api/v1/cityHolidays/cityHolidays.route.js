import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import rbac from '../../../middlewares/rbac.middleware.js';
import { CityHolidaysController } from './cityHolidays.controller.js';

const router = express.Router();

router.get('/', auth, CityHolidaysController.getCityHolidays);
router.post('/', auth, CityHolidaysController.createCityHolidays);
router.get('/:id', auth, CityHolidaysController.getCityHoliday);
router.patch('/:id', auth, CityHolidaysController.updateCityHolidays);
router.delete('/:id', auth, CityHolidaysController.deleteCityHolidays);

export default router;
