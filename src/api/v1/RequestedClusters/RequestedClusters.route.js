import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import rbac from '../../../middlewares/rbac.middleware.js';
import { RequestedClustersController } from './RequestedClusters.controller.js';

const router = express.Router();

router.get('/', auth, RequestedClustersController.getRequestedClusters);
router.post('/', auth, RequestedClustersController.createRequestedCluster);
router.get('/:id', auth, RequestedClustersController.getRequestedCluster);
router.patch('/:id', auth, RequestedClustersController.updateRequestedCluster);
router.delete('/:id', auth, RequestedClustersController.deleteRequestedCluster);
router.get('/dashboard', auth, RequestedClustersController.getRequestedClustersDashboard);

export default router;



