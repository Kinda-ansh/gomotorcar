import express from 'express';
const router = express.Router();
import createResponse from '../../utils/response';
import httpStatus from '../../utils/httpStatus';

import userRoutes from './User/user.route';
import brandRoutes from './brand/brand.route';
import carModelRoutes from './CarModel/carModel.route';
import carCategoryRoutes from './CarCategory/carCategory.route';
import fuelTypeRoutes from './FuelType/fuelType.route';
import residenceTypeRoutes from './residence-type/residence-type.route';
import clusterRoutes from './cluster/cluster.route';
import carTransmissionTypeRoutes from './CarTransmissionType/carTransmissionType.route';
import carRegistrationTypeRoutes from './CarRegistrationType/carRegistrationType.route';
import rolesPermissionRoutes from './RolesAndPermissions/RolesPermission.route';
import carsRoutes from './Car/Cars.route';

const { FileUploadController } = require('./common/fileupload.controller');
const { upload, uploadFile, uploadMultipleFiles } = FileUploadController;
const { SearchController } = require('./common/search.controller');
const { VersionController } = require('./common/version.controller');

// all v1 routes
router.use('/auth', userRoutes);
router.use('/cluster', clusterRoutes);
router.use('/brand', brandRoutes);
router.use('/car-category', carCategoryRoutes);
router.use('/fuel-type', fuelTypeRoutes);
router.use('/car-model', carModelRoutes);
router.use('/residence-type', residenceTypeRoutes);
router.use('/car-transmission-type', carTransmissionTypeRoutes);
router.use('/car-registration-type', carRegistrationTypeRoutes);
router.use('/roles-permissions', rolesPermissionRoutes);
router.use('/cars', carsRoutes);

// router.post('/version', VersionController.matchVersion);
router.post('/version-create', VersionController.createVersion);
router.patch('/version', VersionController.updateVersion);
router.get('/version', VersionController.getVersion);
router.get('/version/:id', VersionController.getVersionsByID);
router.post('/upload', upload.single('file'), uploadFile);
router.post('/multi-upload', upload.single('file'), uploadMultipleFiles);
router.get('/search/:collectionName', SearchController.search);


/**
 * Middleware to handle 404 Not Found.
 */
router.use((req, res) => {
  createResponse({
    res,
    statusCode: httpStatus.NOT_FOUND,
    message: 'API endpoint not found',
  });
});

export default router;
