import httpStatus from '../../../utils/httpStatus';
import createResponse from '../../../utils/response';
import { extractCommonQueryParams, getIdFromParams } from '../../../utils/requestHelper';
import { getCommonSearchConditionForMasters } from '../../../utils/commonHelper';
import RequestedClusters from './RequestedClusters.model';
import { createRequestedClusterSchema, updateRequestedClusterSchema } from './RequestedClusters.validator';
import ResidenceType from './RequestedClusters.model';

const getRequestedClusters = async (req, res) => {
    try {
        const { limit = 1000, skip = 0, search, isActive } = extractCommonQueryParams(req);
        let query = { deletedAt: null };

        if (req.query.showActiveOnly == 'true') {
            query.isActive = true;
        }

        if (search) {
            query.$or = getCommonSearchConditionForMasters(search, ['apartmentName', 'customerName', 'mobileNo', 'roleDesignation']);
        }

        if (isActive === 'true' || isActive === true) {
            query.isActive = true;
        } else if (isActive === 'false' || isActive === false) {
            query.isActive = false;
        }

        const [list, totalCount] = await Promise.all([
            RequestedClusters.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('residenceType', 'name code')
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email'),
            RequestedClusters.countDocuments(query),
        ]);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Requested clusters retrieved successfully',
            data: { list, count: totalCount },
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Failed to fetch requested clusters',
            status: false,
            error: error.message,
        });
    }
};

const createRequestedCluster = async (req, res) => {
    try {
        req.body.createdBy = req.user._id;
        req.body.updatedBy = req.user._id;

        const data = await createRequestedClusterSchema.validate(req.body, {
            abortEarly: false,
        });

        const record = await RequestedClusters.create(data);

        // Populate the created record for response
        const populatedRecord = await RequestedClusters.findById(record._id)
            .populate('residenceType', 'name code')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        return createResponse({
            res,
            statusCode: httpStatus.CREATED,
            status: true,
            message: 'Requested cluster created successfully.',
            data: populatedRecord,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message: error.code === 11000 ? 'Requested cluster with this code already exists.' : error.message,
            error: error.message,
        });
    }
};

const getRequestedCluster = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const record = await RequestedClusters.findOne({ _id: id, deletedAt: null })
            .populate('residenceType', 'name code')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Requested cluster not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Requested cluster fetched successfully',
            data: record,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch requested cluster',
            error: error.message,
        });
    }
};

const updateRequestedCluster = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        req.body.updatedBy = req.user._id;

        const data = await updateRequestedClusterSchema.validate(req.body, {
            abortEarly: false,
        });

        const record = await RequestedClusters.findOneAndUpdate(
            { _id: id, deletedAt: null },
            { $set: data },
            { new: true, runValidators: true }
        )
            .populate('residenceType', 'name code')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Requested cluster not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Requested cluster updated successfully.',
            data: record,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message: error.code === 11000 ? 'Duplicate field value exists.' : 'Failed to update requested cluster.',
            error: error.message,
        });
    }
};

const deleteRequestedCluster = async (req, res) => {
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

        const record = await RequestedClusters.findOne({ _id: id, deletedAt: null });
        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Requested cluster not found',
            });
        }

        await record.softDelete(req.user._id);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Requested cluster deleted successfully',
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to delete requested cluster',
            error: error.message,
        });
    }
};

const getRequestedClustersDashboard = async (req, res) => {
    try {
        const query = { deletedAt: null };

        // Aggregation pipeline for dashboard data
        const aggregation = [
            { $match: query },
            {
                $facet: {
                    totalRequestedClusters: [{ $count: 'count' }],
                    totalResidenceTypes: [{ $group: { _id: '$residenceType' } }, { $count: 'count' }],
                    confirmedRequests: [
                        { $match: { confirmation: true } },
                        { $count: 'count' }
                    ],
                    pendingRequests: [
                        { $match: { confirmation: false } },
                        { $count: 'count' }
                    ],
                    latestRequestedClusters: [
                        { $sort: { createdAt: -1 } },
                        { $limit: 10 },
                        {
                            $lookup: {
                                from: 'residencetypes',
                                localField: 'residenceType',
                                foreignField: '_id',
                                as: 'residenceType'
                            }
                        },
                        { $unwind: { path: '$residenceType', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'createdBy',
                                foreignField: '_id',
                                as: 'createdBy'
                            }
                        },
                        { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } }
                    ]
                }
            }
        ];

        const result = await RequestedClusters.aggregate(aggregation);

        // Get total counts from respective models
        const [totalResidenceTypes] = await Promise.all([
            ResidenceType.countDocuments({ deletedAt: null })
        ]);

        const data = result[0] || {};

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Requested clusters dashboard data retrieved successfully',
            data: {
                totalRequestedClusters: data.totalRequestedClusters[0]?.count || 0,
                totalResidenceTypes: totalResidenceTypes || 0,
                confirmedRequests: data.confirmedRequests[0]?.count || 0,
                pendingRequests: data.pendingRequests[0]?.count || 0,
                latestRequestedClusters: data.latestRequestedClusters || []
            }
        });
    } catch (error) {
        console.error('Requested clusters dashboard error:', error);
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch requested clusters dashboard',
            error: error.message
        });
    }
};

export const RequestedClustersController = {
    getRequestedClusters,
    createRequestedCluster,
    getRequestedCluster,
    updateRequestedCluster,
    deleteRequestedCluster,
    getRequestedClustersDashboard
};