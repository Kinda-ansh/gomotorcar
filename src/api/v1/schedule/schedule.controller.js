import httpStatus from '../../../utils/httpStatus';
import createResponse from '../../../utils/response';
import {
    extractCommonQueryParams,
    getIdFromParams,
} from '../../../utils/requestHelper';
import { getCommonSearchConditionForMasters } from '../../../utils/commonHelper';
import Schedule from './schedule.model';
import { createScheduleSchema, updateScheduleSchema } from './schedule.validator';
import dayjs from '../../../utils/dayjs';
import { IST } from '../../../utils/dayjs';
const getSchedules = async (req, res) => {
    try {
        const { limit = 1000, skip = 0, search, isActive } = extractCommonQueryParams(req);
        let query = { deletedAt: null };

        if (req.query.showActiveOnly == 'true') {
            query.isActive = true;
        }

        if (search) {
            // For schedule, search by code and workingDays
            query.$or = getCommonSearchConditionForMasters(search, ['workingDays']);
        }

        if (isActive === 'true' || isActive === true) {
            query.isActive = true;
        } else if (isActive === 'false' || isActive === false) {
            query.isActive = false;
        }

        const [list, totalCount] = await Promise.all([
            Schedule.find(query)
                .populate('cityHoliday', 'name holidays')
                .populate({
                    path: 'car',
                    select: 'code registrationNumber brand carModel carRegistrationType carTransmissionType fuelType',
                    populate: [
                        { path: 'brand', select: 'name' },
                        {
                            path: 'carModel', select: 'name',
                            populate: [
                                { path: 'carCategory', select: 'name' }
                            ],
                        },
                        {
                            path: 'carRegistrationType', select: 'name'
                        },
                        { path: 'carTransmissionType', select: 'name' },
                        { path: 'fuelType', select: 'name' }
                    ]
                })
                .populate('package', 'code name price duration')
                .populate('customer', 'name email phone')
                .populate('createdBy', 'name email')
             
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Schedule.countDocuments(query),
        ]);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Schedules retrieved',
            data: { list, count: totalCount },
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Failed to fetch schedules',
            status: false,
            error: error.message,
        });
    }
};

const createSchedule = async (req, res) => {
    try {
        req.body.createdBy = req.user._id;
        req.body.updatedBy = req.user._id;

        // Validate the request data
        const data = await createScheduleSchema.validate(req.body, {
            abortEarly: false,
        });

        // Parse dates as UTC date strings (YYYY-MM-DD format)
        // Don't apply timezone conversion - treat the input date as the actual calendar date
        if (data.startDate) {
            // If it's already a Date object from Yup, extract the date string and parse as UTC
            if (data.startDate instanceof Date) {
                // Get the ISO string and extract just the date part
                const dateStr = data.startDate.toISOString().split('T')[0];
                data.startDate = dayjs.utc(dateStr).toDate();
            } else {
                // If it's a string, parse directly as UTC
                data.startDate = dayjs.utc(data.startDate).toDate();
            }
        }
        if (data.endDate) {
            // If it's already a Date object from Yup, extract the date string and parse as UTC
            if (data.endDate instanceof Date) {
                // Get the ISO string and extract just the date part
                const dateStr = data.endDate.toISOString().split('T')[0];
                data.endDate = dayjs.utc(dateStr).toDate();
            } else {
                // If it's a string, parse directly as UTC
                data.endDate = dayjs.utc(data.endDate).toDate();
            }
        }

        // Additional validation: Check if endDate is after startDate
        const startDate = dayjs.utc(data.startDate);
        const endDate = dayjs.utc(data.endDate);

        if (endDate.isSameOrBefore(startDate, 'day')) {
            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                status: false,
                message: 'End date must be after start date',
                error: 'Invalid date range',
            });
        }

        // Check if start date is not in the past
        const today = dayjs().tz(IST).startOf('day');
        const todayUTC = dayjs.utc(today.format('YYYY-MM-DD'));

        if (startDate.isBefore(todayUTC, 'day')) {
            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                status: false,
                message: 'Start date cannot be in the past',
                error: 'Invalid start date',
            });
        }

        // Schedule days will be generated automatically by the pre-save hook
        const schedule = await Schedule.create(data);

        return createResponse({
            res,
            statusCode: httpStatus.CREATED,
            status: true,
            message: 'Schedule created successfully.',
            data: schedule,
        });
    } catch (error) {
        // Handle validation errors from Yup
        if (error.name === 'ValidationError') {
            const errors = error.inner ? error.inner.map(err => ({
                field: err.path,
                message: err.message
            })) : [{ message: error.message }];

            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                status: false,
                message: 'Validation failed',
                error: errors,
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            return createResponse({
                res,
                statusCode: httpStatus.CONFLICT,
                status: false,
                message: 'Schedule with this code already exists.',
                error: error.message,
            });
        }

        // Handle mongoose validation errors
        if (error.name === 'MongooseError' || error.name === 'Error') {
            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                status: false,
                message: error.message,
                error: error.message,
            });
        }

        // Handle other errors
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to create schedule',
            error: error.message,
        });
    }
};
const getSchedule = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const schedule = await Schedule.findOne({ _id: id, deletedAt: null })
            .populate('cityHoliday', 'name holidays')
            .populate({
                path: 'car',
                select: 'code registrationNumber brand carModel carRegistrationType carTransmissionType fuelType',
                populate: [
                    { path: 'brand', select: 'name' },
                    {
                        path: 'carModel', select: 'name',
                        populate: [
                            { path: 'carCategory', select: 'name' }
                        ],
                    },
                    {
                        path: 'carRegistrationType', select: 'name'
                    },
                    { path: 'carTransmissionType', select: 'name' },
                    { path: 'fuelType', select: 'name' }
                ]
            })
            .populate('package', 'code name price duration')
            .populate('customer', 'name email phone')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .populate('deletedBy', 'name email');

        if (!schedule) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Schedule not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Schedule fetched successfully',
            data: schedule,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch schedule',
            error: error.message,
        });
    }
};

const updateSchedule = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        req.body.updatedBy = req.user._id;

        const data = await updateScheduleSchema.validate(req.body, {
            abortEarly: false,
        });

        const schedule = await Schedule.findOneAndUpdate(
            { _id: id, deletedAt: null },
            { $set: data },
            { new: true }
        );

        if (!schedule) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Schedule not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Schedule updated successfully.',
            data: schedule,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message: error.code === 11000 ? 'Duplicate field value exists.' : 'Failed to update schedule.',
            error: error.message,
        });
    }
};

const deleteSchedule = async (req, res) => {
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

        const schedule = await Schedule.findOne({ _id: id, deletedAt: null });
        if (!schedule) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Schedule not found',
            });
        }

        await schedule.softDelete(req.user._id);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Schedule deleted successfully',
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to delete schedule',
            error: error.message,
        });
    }
};

export const ScheduleController = {
    getSchedules,
    createSchedule,
    getSchedule,
    updateSchedule,
    deleteSchedule,
};