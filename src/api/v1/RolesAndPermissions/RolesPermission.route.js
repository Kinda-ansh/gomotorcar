import express from 'express';
import auth from '../../../middlewares/auth.middleware.js';
import { RoleController } from './RolesPermission.controller';
import rbac from '../../../middlewares/rbac.middleware.js';
import Role from './Roles.model.js';

const router = express.Router();

// Bootstrap helper: allow viewing/creating roles when there are no roles yet
const allowIfNoRoles = async (req, res, next) => {
    try {
        const count = await Role.countDocuments();
        if (count === 0) return next();
    } catch (_) { }
    return rbac('roles-permissions', req.method === 'POST' ? 'create' : 'view')(req, res, next);
};

router.get('/roles', auth, allowIfNoRoles, RoleController.getRoles);
router.post('/roles', auth, allowIfNoRoles, RoleController.createRole);
router.get('/roles/:id', auth, rbac('roles-permissions', 'view'), RoleController.getRole);
router.patch('/roles/:id', auth, rbac('roles-permissions', 'edit'), RoleController.updateRole);
router.get('/permissions/:id', auth, rbac('roles-permissions', 'view'), RoleController.getPermissions);

export default router;
