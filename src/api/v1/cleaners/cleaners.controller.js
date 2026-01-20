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

        // Extract user-related fields
        const { firstName, lastName, mobile, ...cleanerData } = payload;

        // Check if mobile number already exists
        const existingUser = await User.findOne({ mobile });
        if (existingUser) {
            return createResponse({
                res,
                statusCode: httpStatus.CONFLICT,
                status: false,
                message: 'Mobile number already registered',
            });
        }

        // Step 1: Create User first with combined name and mobile
        const newUser = await User.create({
            name: `${firstName} ${lastName}`.trim(),
            mobile,
            loginMethod: 'mobile',
            isActive: true,
            mobileVerified: false,
        });

        try {
            // Step 2: Create Cleaner profile with the userId and store firstName/lastName separately
            const cleaner = await Cleaner.create({
                user: newUser._id,
                firstName,
                lastName,
                ...cleanerData,
            });

            // Populate user data in response
            await cleaner.populate('user', 'name mobile email');

            return createResponse({
                res,
                statusCode: httpStatus.CREATED,
                status: true,
                message: 'Cleaner created successfully',
                data: cleaner,
            });
        } catch (cleanerError) {
            // If cleaner creation fails, delete the created user to maintain data consistency
            await User.findByIdAndDelete(newUser._id);
            throw cleanerError;
        }
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

        // Handle MongoDB duplicate key error
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return createResponse({
                res,
                statusCode: httpStatus.CONFLICT,
                status: false,
                message: `${field} already exists`,
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

        // Build search pipeline
        const pipeline = [];

        // If search is provided, first lookup users and filter
        if (search) {
            pipeline.push(
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user',
                        foreignField: '_id',
                        as: 'userDataSearch',
                    },
                },
                {
                    $unwind: {
                        path: '$userDataSearch',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $match: {
                        $or: [
                            { 'userDataSearch.name': { $regex: search, $options: 'i' } },
                            { 'userDataSearch.mobile': { $regex: search, $options: 'i' } },
                            { 'address.city': { $regex: search, $options: 'i' } },
                            { 'address.pinCode': { $regex: search, $options: 'i' } },
                        ],
                    },
                }
            );
        }

        pipeline.push(
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        );

        // Add user lookup if not already done in search
        if (!search) {
            pipeline.push(
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
                }
            );
        } else {
            // Rename userDataSearch to userData for consistency
            pipeline.push({
                $addFields: {
                    userData: '$userDataSearch',
                },
            });
        }

        pipeline.push(
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
                    'userData._id': 1,
                    'userData.name': 1,
                    'userData.mobile': 1,
                    'userData.email': 1,
                    'approverData.name': 1,
                    'querierData.name': 1,
                },
            }
        );

        const cleanersAgg = await Cleaner.aggregate(pipeline);

        // Count total documents with search filter
        let totalCount;
        if (search) {
            const countPipeline = [
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user',
                        foreignField: '_id',
                        as: 'userDataSearch',
                    },
                },
                {
                    $unwind: {
                        path: '$userDataSearch',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $match: {
                        $or: [
                            { 'userDataSearch.name': { $regex: search, $options: 'i' } },
                            { 'userDataSearch.mobile': { $regex: search, $options: 'i' } },
                            { 'address.city': { $regex: search, $options: 'i' } },
                            { 'address.pinCode': { $regex: search, $options: 'i' } },
                        ],
                    },
                },
                { $count: 'total' },
            ];
            const countResult = await Cleaner.aggregate(countPipeline);
            totalCount = countResult[0]?.total || 0;
        } else {
            totalCount = await Cleaner.countDocuments();
        }

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
