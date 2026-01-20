import httpStatus from '../../../utils/httpStatus';
import createResponse from '../../../utils/response';
import {
    extractCommonQueryParams,
    getIdFromParams,
} from '../../../utils/requestHelper';
import Cleaner from './cleaners.model';
import User from '../User/user.model';
import {
    createCleanerValidation,
    updateCleanerValidation,
    updateApprovalStatusValidation,
} from './cleaners.validator';
import { getCommonSearchConditionForMasters } from '../../../utils/commonHelper';

// Create Cleaner
const createCleaner = async (req, res) => {
    try {
        const payload = await createCleanerValidation.validate(req.body, {
            abortEarly: false,
        });

        // Check if user exists
        const user = await User.findById(payload.user);
        if (!user) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'User not found',
            });
        }

        // Check if cleaner already exists for this user
        const existingCleaner = await Cleaner.findOne({ user: payload.user });
        if (existingCleaner) {
            return createResponse({
                res,
                statusCode: httpStatus.CONFLICT,
                status: false,
                message: 'Cleaner profile already exists for this user',
            });
        }

        const cleaner = await Cleaner.create(payload);

        return createResponse({
            res,
            statusCode: httpStatus.CREATED,
            status: true,
            message: 'Cleaner created successfully',
            data: cleaner,
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                message: error.errors?.[0] || 'Validation error',
                status: false,
                error: error.errors,
            });
        }
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Failed to create cleaner',
            status: false,
            error: error.message,
        });
    }
};

// Get All Cleaners
const getCleaners = async (req, res) => {
    try {
        const { limit = 1000, skip = 0, search } = extractCommonQueryParams(req);
        let matchQuery = {};

        if (search) {
            matchQuery.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { 'address.city': { $regex: search, $options: 'i' } },
                { 'address.pinCode': { $regex: search, $options: 'i' } },
            ];
        }

        const cleanersAgg = await Cleaner.aggregate([
            { $match: matchQuery },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userData',
                },
            },
            {
                $unwind: {
                    path: '$userData',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'approvedBy',
                    foreignField: '_id',
                    as: 'approverData',
                },
            },
            {
                $unwind: {
                    path: '$approverData',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'queriedBy',
                    foreignField: '_id',
                    as: 'querierData',
                },
            },
            {
                $unwind: {
                    path: '$querierData',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    firstName: 1,
                    lastName: 1,
                    address: 1,
                    work: 1,
                    verification: 1,
                    referralSource: 1,
                    approvalStatus: 1,
                    queriedComment: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    'userData.name': 1,
                    'userData.mobile': 1,
                    'userData.email': 1,
                    'approverData.name': 1,
                    'querierData.name': 1,
                },
            },
        ]);

        const totalCount = await Cleaner.countDocuments(matchQuery);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Cleaners retrieved successfully',
            data: { list: cleanersAgg, count: totalCount },
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Failed to fetch cleaners',
            status: false,
            error: error.message,
        });
    }
};

// Get Single Cleaner
const getCleaner = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const cleaner = await Cleaner.findById(id)
            .populate('user', 'name mobile email')
            .populate('approvedBy', 'name')
            .populate('queriedBy', 'name');

        if (!cleaner) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Cleaner not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Cleaner fetched successfully',
            data: cleaner,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch cleaner',
            error: error.message,
        });
    }
};

// Update Cleaner
const updateCleaner = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const payload = await updateCleanerValidation.validate(req.body, {
            abortEarly: false,
        });

        const cleaner = await Cleaner.findByIdAndUpdate(
            id,
            { $set: payload },
            { new: true, runValidators: true }
        ).populate('user', 'name mobile email');

        if (!cleaner) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Cleaner not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Cleaner updated successfully',
            data: cleaner,
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                message: error.errors?.[0] || 'Validation error',
                status: false,
                error: error.errors,
            });
        }
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to update cleaner',
            error: error.message,
        });
    }
};

// Update Approval Status
const updateApprovalStatus = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const payload = await updateApprovalStatusValidation.validate(req.body, {
            abortEarly: false,
        });

        const updateData = {
            approvalStatus: payload.approvalStatus,
        };

        // Handle different approval statuses
        if (payload.approvalStatus === 'approved') {
            updateData.approvedBy = req.user._id;
            updateData.queriedBy = null;
            updateData.queriedComment = null;
        } else if (payload.approvalStatus === 'queried') {
            updateData.queriedBy = req.user._id;
            updateData.queriedComment = payload.queriedComment;
        } else if (payload.approvalStatus === 'rejected') {
            updateData.approvedBy = null;
            updateData.queriedBy = null;
            updateData.queriedComment = null;
        }

        const cleaner = await Cleaner.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        )
            .populate('user', 'name mobile email')
            .populate('approvedBy', 'name')
            .populate('queriedBy', 'name');

        if (!cleaner) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Cleaner not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: `Cleaner ${payload.approvalStatus} successfully`,
            data: cleaner,
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                message: error.errors?.[0] || 'Validation error',
                status: false,
                error: error.errors,
            });
        }
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to update approval status',
            error: error.message,
        });
    }
};

// Delete Cleaner
const deleteCleaner = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const cleaner = await Cleaner.findByIdAndDelete(id);

        if (!cleaner) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Cleaner not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Cleaner deleted successfully',
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to delete cleaner',
            error: error.message,
        });
    }
};

export const CleanerController = {
    createCleaner,
    getCleaners,
    getCleaner,
    updateCleaner,
    updateApprovalStatus,
    deleteCleaner,
};
