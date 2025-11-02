import httpStatus from '../../../utils/httpStatus';
import createResponse from '../../../utils/response';
import {
    extractCommonQueryParams,
    getIdFromParams,
} from '../../../utils/requestHelper';
import { getCommonSearchConditionForMasters } from '../../../utils/commonHelper';

import CityHolidays from './cityHolidays.model';
import {
    createCityHolidaysSchema,
    updateCityHolidaysSchema,
} from './cityHolidays.validator';
import dayjs from '../../../utils/dayjs';
import { IST } from '../../../utils/dayjs';

const getCityHolidays = async (req, res) => {
    try {
        const { limit = 1000, skip = 0, search, isActive } = extractCommonQueryParams(req);

        let query = { deletedAt: null };

        if (req.query.showActiveOnly === 'true') {
            query.isActive = true;
        }

        if (search) {
            query.$or = getCommonSearchConditionForMasters(search, ['cityName']);
        }

        if (isActive === 'true') query.isActive = true;
        if (isActive === 'false') query.isActive = false;

        const [list, totalCount] = await Promise.all([
            CityHolidays.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            CityHolidays.countDocuments(query),
        ]);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'City Holidays retrieved successfully',
            data: { list, count: totalCount },
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch City Holidays',
            error: error.message,
        });
    }
};

const createCityHolidays = async (req, res) => {
    try {
        req.body.createdBy = req.user._id;
        req.body.updatedBy = req.user._id;

        const data = await createCityHolidaysSchema.validate(req.body, { abortEarly: false });

        if (data.holidays && Array.isArray(data.holidays)) {
            data.holidays = data.holidays.map(holiday => {
                let normalizedDate;
                
                if (holiday.date instanceof Date) {
                    // Extract date string and parse as UTC
                    const dateStr = holiday.date.toISOString().split('T')[0];
                    normalizedDate = dayjs.utc(dateStr).toDate();
                } else {
                    // Parse string directly as UTC and set to start of day
                    normalizedDate = dayjs.utc(holiday.date).startOf('day').toDate();
                }
                
                return {
                    ...holiday,
                    date: normalizedDate
                };
            });
        }

        const doc = await CityHolidays.create(data);

        return createResponse({
            res,
            statusCode: httpStatus.CREATED,
            status: true,
            message: 'City Holidays created successfully',
            data: doc,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode:
                error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message:
                error.code === 11000
                    ? 'City already exists'
                    : error.message,
            error: error.message,
        });
    }
};


const getCityHoliday = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const doc = await CityHolidays.findOne({ _id: id, deletedAt: null });

        if (!doc) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'City Holidays not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'City Holidays fetched successfully',
            data: doc,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch City Holidays',
            error: error.message,
        });
    }
};

const updateCityHolidays = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        req.body.updatedBy = req.user._id;

        const data = await updateCityHolidaysSchema.validate(req.body, { abortEarly: false });

        // ✅ FIX: Normalize all holiday dates to UTC midnight
        if (data.holidays && Array.isArray(data.holidays)) {
            data.holidays = data.holidays.map(holiday => {
                let normalizedDate;
                
                if (holiday.date instanceof Date) {
                    // Extract date string and parse as UTC
                    const dateStr = holiday.date.toISOString().split('T')[0];
                    normalizedDate = dayjs.utc(dateStr).toDate();
                } else {
                    // Parse string directly as UTC and set to start of day
                    normalizedDate = dayjs.utc(holiday.date).startOf('day').toDate();
                }
                
                return {
                    ...holiday,
                    date: normalizedDate
                };
            });
        }

        const doc = await CityHolidays.findOneAndUpdate(
            { _id: id, deletedAt: null },
            { $set: data },
            { new: true }
        );

        if (!doc) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'City Holidays not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'City Holidays updated successfully',
            data: doc,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode:
                error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message:
                error.code === 11000
                    ? 'Duplicate field value exists.'
                    : 'Failed to update City Holidays',
            error: error.message,
        });
    }
};


// ✅ Soft Delete
const deleteCityHolidays = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const doc = await CityHolidays.findOne({ _id: id, deletedAt: null });

        if (!doc) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'City Holidays not found',
            });
        }

        await doc.softDelete(req.user._id);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'City Holidays deleted successfully',
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to delete City Holidays',
            error: error.message,
        });
    }
};


export const CityHolidaysController = {
    getCityHolidays,
    createCityHolidays,
    getCityHoliday,
    updateCityHolidays,
    deleteCityHolidays,
};
