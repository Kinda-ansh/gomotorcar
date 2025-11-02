import * as yup from 'yup';
import mongoose from 'mongoose';

const objectId = yup
    .string()
    .nullable()
    .notRequired()
    .test('is-object-id', '${path} must be a valid MongoDB ObjectId', (value) =>
        value ? mongoose.Types.ObjectId.isValid(value) : true
    );

const nonEmptyString = (label) =>
    yup
        .string()
        .trim()
        .notOneOf(['', null], `${label} cannot be empty`)
        .optional();

const holidaySchema = yup.object({
    holidayName: yup
        .string()
        .trim()
        .required('Holiday name is required'),
    date: yup
        .string()
        .matches(/^\d{4}-\d{2}-\d{2}$/, 'Holiday date must be in YYYY-MM-DD format')
        .required('Holiday date is required'),
});

export const createCityHolidaysSchema = yup.object({
    cityName: yup
        .string()
        .trim()
        .required('City name is required'),

    holidays: yup
        .array()
        .of(holidaySchema)
        .min(1, 'At least one holiday is required'),

    createdBy: objectId,
    updatedBy: objectId,

    isActive: yup.boolean().default(true),
});

export const updateCityHolidaysSchema = yup.object({
    cityName: nonEmptyString('City name'),

    holidays: yup
        .array()
        .of(holidaySchema)
        .optional(),

    updatedBy: objectId.required('UpdatedBy is required'),

    isActive: yup.boolean().optional(),
});