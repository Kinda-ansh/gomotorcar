import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import rbac from '../../../middlewares/rbac.middleware.js';
import { ClusterController } from './cluster.controller';

const router = express.Router();

router.get('/', auth, ClusterController.getClusters);
router.post('/', auth, ClusterController.createCluster);
router.get('/:id', auth, ClusterController.getCluster);
router.patch('/:id', auth, ClusterController.updateCluster);
router.delete('/:id', auth, ClusterController.deleteCluster);

export default router;

