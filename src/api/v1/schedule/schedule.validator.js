import * as yup from 'yup';
import mongoose from 'mongoose';

const objectId = yup
    .string()
    .nullable()
    .notRequired()
    .test('is-object-id', '${path} must be a valid MongoDB ObjectId', (value) =>
        value ? mongoose.Types.ObjectId.isValid(value) : true
    );

// Validation for each day inside scheduleDays array
const scheduleDaySchema = yup.object({
    date: yup.date().required('Schedule day date is required'),
    dayType: yup
        .string()
        .oneOf(['internalCleaningDay', 'externalCleaningDay', 'holiday'], 'Invalid day type')
        .required('Day type is required'),
    isCompleted: yup.boolean().default(false),
    notes: yup.string().nullable(),
});

export const createScheduleSchema = yup.object({
    startDate: yup.string()
        .required('Start date is required')
        .matches(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
    endDate: yup.string()
        .required('End date is required')
        .matches(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),

    // workingDays and scheduleDays are auto-generated, so make them optional
    createdBy: objectId.required('CreatedBy is required'),
    updatedBy: objectId.required('UpdatedBy is required'),

    isActive: yup.boolean().default(true),
});

export const updateScheduleSchema = yup.object({
    startDate: yup
        .date()
        .optional()
        .typeError('Start date must be a valid date'),

    endDate: yup
        .date()
        .optional()
        .typeError('End date must be a valid date')
        .test('end-after-start', 'End date must be after or equal to start date', function (value) {
            const { startDate } = this.parent;
            if (value && startDate) return new Date(value) >= new Date(startDate);
            return true;
        }),

    workingDays: yup
        .number()
        .typeError('Working days must be a number')
        .nullable()
        .optional(),

    scheduleDays: yup.array().of(scheduleDaySchema).optional(),

    cityHoliday: objectId,
    car: objectId.optional(),
    package: objectId,
    customer: objectId,

    updatedBy: objectId.required('UpdatedBy is required'),
    isActive: yup.boolean().optional(),
});