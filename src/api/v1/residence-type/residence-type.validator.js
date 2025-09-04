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

export const createResidenceTypeSchema = yup.object({
    name: yup.string().required('Name is required').trim(),

    createdBy: objectId,
    updatedBy: objectId,
    isActive: yup.boolean().default(true),
});

export const updateResidenceTypeSchema = yup.object({
    name: nonEmptyString('Name'),
    updatedBy: objectId.required('UpdatedBy is required'),
    isActive: yup.boolean().optional(),
});
