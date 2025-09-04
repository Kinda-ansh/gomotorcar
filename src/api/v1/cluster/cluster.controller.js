import httpStatus from '../../../utils/httpStatus';
import createResponse from '../../../utils/response';
import { extractCommonQueryParams, getIdFromParams } from '../../../utils/requestHelper';
import { getCommonSearchConditionForMasters } from '../../../utils/commonHelper';
import Cluster from './cluster.model';
import { createClusterSchema, updateClusterSchema, approvalUpdateSchema } from './cluster.validator';

const getClusters = async (req, res) => {
    try {
        const { limit = 1000, skip = 0, search, isActive } = extractCommonQueryParams(req);
        const { approval_status } = req.query;

        let query = { deletedAt: null };

        if (req.query.showActiveOnly == 'true') {
            query.isActive = true;
        }

        if (search) {
            query.$or = getCommonSearchConditionForMasters(search, ['name', 'address.area', 'address.city', 'address.state']);
        }

        if (isActive === 'true' || isActive === true) {
            query.isActive = true;
        } else if (isActive === 'false' || isActive === false) {
            query.isActive = false;
        }

        // Filter by approval status if provided
        if (approval_status && ['pending', 'approved', 'rejected'].includes(approval_status)) {
            query['approval_status.status'] = approval_status;
        }

        const [list, totalCount, approvedCount, pendingCount, rejectedCount] = await Promise.all([
            Cluster.find(query)
                .populate('residence_type', 'name code')
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Cluster.countDocuments(query),
            // Count approved clusters
            Cluster.countDocuments({
                deletedAt: null,
                'approval_status.status': 'approved'
            }),
            // Count pending clusters
            Cluster.countDocuments({
                deletedAt: null,
                'approval_status.status': 'pending'
            }),
            // Count rejected clusters
            Cluster.countDocuments({
                deletedAt: null,
                'approval_status.status': 'rejected'
            })
        ]);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Clusters retrieved',
            data: {
                list,
                count: totalCount,
                statusCounts: {
                    approved: approvedCount,
                    pending: pendingCount,
                    rejected: rejectedCount,
                    total: approvedCount + pendingCount + rejectedCount
                }
            },
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Failed to fetch clusters',
            status: false,
            error: error.message,
        });
    }
};

const createCluster = async (req, res) => {
    try {
        req.body.createdBy = req.user._id;
        req.body.updatedBy = req.user._id;

        const data = await createClusterSchema.validate(req.body, {
            abortEarly: false,
        });

        const record = await Cluster.create(data);
        const populatedRecord = await Cluster.findById(record._id)
            .populate('residence_type', 'name code')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        return createResponse({
            res,
            statusCode: httpStatus.CREATED,
            status: true,
            message: 'Cluster created successfully.',
            data: populatedRecord,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message: error.code === 11000 ? 'Cluster with this name or code already exists.' : error.message,
            error: error.message,
        });
    }
};

const getCluster = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const record = await Cluster.findOne({ _id: id, deletedAt: null })
            .populate('residence_type', 'name code')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Cluster not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Cluster fetched successfully',
            data: record,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch cluster',
            error: error.message,
        });
    }
};

const updateCluster = async (req, res) => {
    try {
        const id = getIdFromParams(req);

        // Set updatedBy before validation
        if (req.user && req.user._id) {
            req.body.updatedBy = req.user._id;
        }

        console.log('Update cluster request body:', req.body);
        console.log('Update cluster ID:', id);
        console.log('User object:', req.user);
        console.log('User ID:', req.user?._id);

        // Use minimal validation for approval/rejection operations
        const isApprovalOperation = req.body.approval_status && Object.keys(req.body).length <= 2; // approval_status + updatedBy
        const schema = isApprovalOperation ? approvalUpdateSchema : updateClusterSchema;

        console.log('Using schema:', isApprovalOperation ? 'approvalUpdateSchema' : 'updateClusterSchema');

        const data = await schema.validate(req.body, {
            abortEarly: false,
        });

        console.log('Validated data:', data);

        const record = await Cluster.findOneAndUpdate(
            { _id: id, deletedAt: null },
            { $set: data },
            { new: true }
        )
            .populate('residence_type', 'name code')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Cluster not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Cluster updated successfully.',
            data: record,
        });
    } catch (error) {
        console.error('Update cluster error:', error);

        // If it's a validation error, provide detailed error information
        if (error.name === 'ValidationError') {
            console.error('Validation errors:', error.errors);
            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                status: false,
                message: 'Validation failed',
                error: error.errors || error.message,
            });
        }

        return createResponse({
            res,
            statusCode: error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message: error.code === 11000 ? 'Duplicate field value exists.' : 'Failed to update cluster.',
            error: error.message,
        });
    }
};

const deleteCluster = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        if (!id) {
            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                status: false,
                message: 'ID not provided',
            });
        }

        const record = await Cluster.findOne({ _id: id, deletedAt: null });
        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Cluster not found',
            });
        }
        await record.softDelete(req.user._id);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Cluster deleted successfully',
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to delete cluster',
            error: error.message,
        });
    }
};

export const ClusterController = {
    getClusters,
    createCluster,
    getCluster,
    updateCluster,
    deleteCluster,
};
