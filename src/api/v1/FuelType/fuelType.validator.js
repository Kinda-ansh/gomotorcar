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

export const createFuelTypeSchema = yup.object({
    name: yup.string().required('Name is required').trim(),
    image: yup.string().trim().nullable(),
    createdBy: objectId,
    updatedBy: objectId,
    isActive: yup.boolean().default(true),
});

export const updateFuelTypeSchema = yup.object({
    name: nonEmptyString('Name'),
    image: yup.string().trim().nullable(),
    updatedBy: objectId.required('UpdatedBy is required'),
    isActive: yup.boolean().optional(),
});


