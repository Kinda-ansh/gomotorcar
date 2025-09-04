import createResponse from '../utils/response';

// Map HTTP method to default action names
const methodToAction = {
    GET: 'view',
    POST: 'create',
    PATCH: 'edit',
    PUT: 'edit',
    DELETE: 'delete',
};

// Derive module name from base route path, e.g., /v1/brand -> brand
const deriveModuleFromPath = (req) => {
    const path = req.baseUrl || req.path || '';
    const parts = path.split('/').filter(Boolean);
    const moduleSegment = parts[parts.length - 1] || '';
    return moduleSegment.trim();
};

const normalize = (value) => String(value || '').toLowerCase().replace(/[\s-]/g, '');

const rbac = (moduleName, actionName) => async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            return createResponse({ res, statusCode: 401, status: false, message: 'Unauthorized' });
        }

        const role = user.userRole; // populated in auth middleware
        if (!role) {
            return createResponse({ res, statusCode: 403, status: false, message: 'Role not assigned' });
        }

        const moduleToCheck = moduleName || deriveModuleFromPath(req);
        const actionToCheck = actionName || methodToAction[req.method] || 'view';

        const permissions = Array.isArray(role.permissions) ? role.permissions : [];
        const modulePerm = permissions.find((p) => normalize(p.module) === normalize(moduleToCheck));

        if (!modulePerm) {
            return createResponse({ res, statusCode: 403, status: false, message: 'Access denied (module)' });
        }

        const actions = Array.isArray(modulePerm.actions) ? modulePerm.actions.map(a => String(a).toLowerCase()) : [];
        if (!actions.includes(String(actionToCheck).toLowerCase())) {
            return createResponse({ res, statusCode: 403, status: false, message: 'Access denied (action)' });
        }

        return next();
    } catch (err) {
        return createResponse({ res, statusCode: 500, status: false, message: 'RBAC check failed', error: err.message });
    }
};

export default rbac;


