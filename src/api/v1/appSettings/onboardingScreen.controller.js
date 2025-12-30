import httpStatus from '../../../utils/httpStatus';
import createResponse from '../../../utils/response';
import {
    extractCommonQueryParams,
    getIdFromParams,
} from '../../../utils/requestHelper';
import { getCommonSearchConditionForMasters } from '../../../utils/commonHelper';
import OnboardingScreen from './onboardingScreen.model';
import { createOnboardingScreenSchema, updateOnboardingScreenSchema } from './appSettings.validator';

const getOnboardingScreens = async (req, res) => {
    try {
        const { limit = 1000, skip = 0, search, isActive } = extractCommonQueryParams(req);
        let query = { deletedAt: null };
        if (req.query.showActiveOnly == 'true') {
            query.isActive = true;
        }

        if (search) {
            query.$or = getCommonSearchConditionForMasters(search, ['title', 'description']);
        }

        if (isActive === 'true' || isActive === true) {
            query.isActive = true;
        } else if (isActive === 'false' || isActive === false) {
            query.isActive = false;
        }

        const [list, totalCount] = await Promise.all([
            OnboardingScreen.find(query)
                .sort({ priority: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            OnboardingScreen.countDocuments(query),
        ]);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Onboarding screens retrieved',
            data: { list, count: totalCount },
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Failed to fetch onboarding screens',
            status: false,
            error: error.message,
        });
    }
};

const createOnboardingScreen = async (req, res) => {
    try {
        req.body.createdBy = req.user._id;
        req.body.updatedBy = req.user._id;

        const data = await createOnboardingScreenSchema.validate(req.body, {
            abortEarly: false,
        });

        const onboardingScreen = await OnboardingScreen.create(data);

        return createResponse({
            res,
            statusCode: httpStatus.CREATED,
            status: true,
            message: 'Onboarding screen created successfully.',
            data: onboardingScreen,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message: error.code === 11000 ? 'Duplicate value exists.' : error.message,
            error: error.message,
        });
    }
};

const getOnboardingScreen = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const onboardingScreen = await OnboardingScreen.findOne({ _id: id, deletedAt: null });

        if (!onboardingScreen) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Onboarding screen not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Onboarding screen fetched successfully',
            data: onboardingScreen,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch onboarding screen',
            error: error.message,
        });
    }
};

const updateOnboardingScreen = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        req.body.updatedBy = req.user._id;

        const data = await updateOnboardingScreenSchema.validate(req.body, {
            abortEarly: false,
        });

        const onboardingScreen = await OnboardingScreen.findOneAndUpdate(
            { _id: id, deletedAt: null },
            { $set: data },
            { new: true }
        );

        if (!onboardingScreen) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Onboarding screen not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Onboarding screen updated successfully.',
            data: onboardingScreen,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message: error.code === 11000 ? 'Duplicate field value exists.' : 'Failed to update onboarding screen.',
            error: error.message,
        });
    }
};

const deleteOnboardingScreen = async (req, res) => {
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

        const onboardingScreen = await OnboardingScreen.findOne({ _id: id, deletedAt: null });
        if (!onboardingScreen) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Onboarding screen not found',
            });
        }
        await onboardingScreen.softDelete(req.user._id);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Onboarding screen deleted successfully',
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to delete onboarding screen',
            error: error.message,
        });
    }
};

export const OnboardingScreenController = {
    getOnboardingScreens,
    createOnboardingScreen,
    getOnboardingScreen,
    updateOnboardingScreen,
    deleteOnboardingScreen,
};
