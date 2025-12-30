
import httpStatus from '../../../utils/httpStatus';
import createResponse from '../../../utils/response';
import {
    extractCommonQueryParams,
    getIdFromParams,
} from '../../../utils/requestHelper';
import { getCommonSearchConditionForMasters } from '../../../utils/commonHelper';
import HomeScreenCarousel from './homeScreenCarousel.model';
import { createHomeScreenCarouselSchema, updateHomeScreenCarouselSchema } from './appSettings.validator';

const getHomeScreenCarousels = async (req, res) => {
    try {
        const { limit = 1000, skip = 0, search, isActive } = extractCommonQueryParams(req);
        let query = { deletedAt: null };
        if (req.query.showActiveOnly == 'true') {
            query.isActive = true;
        }

        if (search) {
            query.$or = getCommonSearchConditionForMasters(search, ['title', 'code']);
        }

        if (isActive === 'true' || isActive === true) {
            query.isActive = true;
        } else if (isActive === 'false' || isActive === false) {
            query.isActive = false;
        }

        const [list, totalCount] = await Promise.all([
            HomeScreenCarousel.find(query)
                .sort({ priority: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit),
            HomeScreenCarousel.countDocuments(query),
        ]);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Home screen carousels retrieved',
            data: { list, count: totalCount },
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Failed to fetch home screen carousels',
            status: false,
            error: error.message,
        });
    }
};

const createHomeScreenCarousel = async (req, res) => {
    try {
        req.body.createdBy = req.user._id;
        req.body.updatedBy = req.user._id;

        const data = await createHomeScreenCarouselSchema.validate(req.body, {
            abortEarly: false,
        });

        const homeScreenCarousel = await HomeScreenCarousel.create(data);

        return createResponse({
            res,
            statusCode: httpStatus.CREATED,
            status: true,
            message: 'Home screen carousel created successfully.',
            data: homeScreenCarousel,
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

const getHomeScreenCarousel = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const homeScreenCarousel = await HomeScreenCarousel.findOne({ _id: id, deletedAt: null });

        if (!homeScreenCarousel) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Home screen carousel not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Home screen carousel fetched successfully',
            data: homeScreenCarousel,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch home screen carousel',
            error: error.message,
        });
    }
};

const updateHomeScreenCarousel = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        req.body.updatedBy = req.user._id;

        const data = await updateHomeScreenCarouselSchema.validate(req.body, {
            abortEarly: false,
        });

        const homeScreenCarousel = await HomeScreenCarousel.findOneAndUpdate(
            { _id: id, deletedAt: null },
            { $set: data },
            { new: true }
        );

        if (!homeScreenCarousel) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Home screen carousel not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Home screen carousel updated successfully.',
            data: homeScreenCarousel,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message: error.code === 11000 ? 'Duplicate field value exists.' : 'Failed to update home screen carousel.',
            error: error.message,
        });
    }
};

const deleteHomeScreenCarousel = async (req, res) => {
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

        const homeScreenCarousel = await HomeScreenCarousel.findOne({ _id: id, deletedAt: null });
        if (!homeScreenCarousel) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Home screen carousel not found',
            });
        }
        await homeScreenCarousel.softDelete(req.user._id);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Home screen carousel deleted successfully',
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to delete home screen carousel',
            error: error.message,
        });
    }
};

export const HomeScreenCarouselController = {
    getHomeScreenCarousels,
    createHomeScreenCarousel,
    getHomeScreenCarousel,
    updateHomeScreenCarousel,
    deleteHomeScreenCarousel,
};
