import httpStatus from '../../../utils/httpStatus';
import createResponse from '../../../utils/response';
import { extractCommonQueryParams, getIdFromParams } from '../../../utils/requestHelper';
import Gettingstarted from './getting-started.model';

/**
 * Get all Gettingstarted entries with optional search, pagination, and isActive filter
 */
const getGettingstartedList = async (req, res) => {
    try {
        const { limit = 1000, skip = 0, search, isActive } = extractCommonQueryParams(req);

        // Initialize query object
        const query = { deletedAt: null };

        // Search filter
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { route: { $regex: search, $options: 'i' } },
            ];
        }

        // Active filter
        if (isActive === 'true' || isActive === true) query.isActive = true;
        else if (isActive === 'false' || isActive === false) query.isActive = false;

        // Fetch data and count in parallel
        const [list, totalCount] = await Promise.all([
            Gettingstarted.find(query)
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .sort({ priority: -1 })
                .skip(skip)
                .limit(limit),
            Gettingstarted.countDocuments(query),
        ]);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Gettingstarted entries retrieved successfully',
            data: { list, count: totalCount },
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch Gettingstarted entries',
            error: error.message,
        });
    }
};


/**
 * Create a new Gettingstarted entry
 */
const createGettingstarted = async (req, res) => {
    try {
        req.body.createdBy = req.user._id;
        req.body.updatedBy = req.user._id;

        const data = req.body;

        const record = await Gettingstarted.create(data);

        const populatedRecord = await Gettingstarted.findById(record._id)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        return createResponse({
            res,
            statusCode: httpStatus.CREATED,
            status: true,
            message: 'Gettingstarted entry created successfully',
            data: populatedRecord,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message: error.code === 11000 ? 'Duplicate entry exists.' : error.message,
            error: error.message,
        });
    }
};

/**
 * Get a single Gettingstarted entry by ID
 */
const getGettingstarted = async (req, res) => {
    try {
        const id = getIdFromParams(req);

        const record = await Gettingstarted.findOne({ _id: id, deletedAt: null })
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Gettingstarted entry not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Gettingstarted entry fetched successfully',
            data: record,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch Gettingstarted entry',
            error: error.message,
        });
    }
};

/**
 * Update a Gettingstarted entry
 */
const updateGettingstarted = async (req, res) => {
    try {
        const id = getIdFromParams(req);

        if (req.user && req.user._id) {
            req.body.updatedBy = req.user._id;
        }

        const data = req.body;

        const record = await Gettingstarted.findOneAndUpdate(
            { _id: id, deletedAt: null },
            { $set: data },
            { new: true }
        )
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Gettingstarted entry not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Gettingstarted entry updated successfully',
            data: record,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message: error.code === 11000 ? 'Duplicate field value exists.' : 'Failed to update entry',
            error: error.message,
        });
    }
};

/**
 * Soft delete a Gettingstarted entry
 */
const deleteGettingstarted = async (req, res) => {
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

        const record = await Gettingstarted.findOne({ _id: id, deletedAt: null });

        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Gettingstarted entry not found',
            });
        }

        // Soft delete
        record.deletedAt = new Date();
        record.deletedBy = req.user._id;
        await record.save();

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Gettingstarted entry deleted successfully',
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to delete Gettingstarted entry',
            error: error.message,
        });
    }
};

export const GettingstartedController = {
    getGettingstartedList,
    createGettingstarted,
    getGettingstarted,
    updateGettingstarted,
    deleteGettingstarted,
};
