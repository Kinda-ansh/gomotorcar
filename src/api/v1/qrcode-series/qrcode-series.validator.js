import * as yup from 'yup';
import mongoose from 'mongoose';

const objectId = yup
    .string()
    .nullable()
    .notRequired()
    .test('is-object-id', '${path} must be a valid MongoDB ObjectId', (value) =>
        value ? mongoose.Types.ObjectId.isValid(value) : true
    );

const requiredObjectId = yup
    .string()
    .required('${path} is required')
    .test('is-object-id', '${path} must be a valid MongoDB ObjectId', (value) =>
        mongoose.Types.ObjectId.isValid(value)
    );

const nonEmptyString = (label) =>
    yup
        .string()
        .trim()
        .notOneOf(['', null], `${label} cannot be empty`)
        .optional();

// Create QR Code Series Schema
export const createQRCodeSeriesSchema = yup.object({
    name: yup.string().required('QR Code Series name is required').trim(),
    prefix: yup.string().required('Prefix is required').trim(),
    range: yup.string().required('Range is required').trim(),
    cluster: requiredObjectId,
    qr_codes: yup
        .array()
        .of(requiredObjectId)
        .default([])
        .optional(),
    is_in_use: yup.boolean().default(false),
    next_to_assign: yup.string().trim().nullable().optional(),
    generated_range: yup.string().trim().nullable().optional(),
    createdBy: requiredObjectId,
    updatedBy: requiredObjectId,
    isActive: yup.boolean().default(true),
});

// Update QR Code Series Schema
export const updateQRCodeSeriesSchema = yup.object({
    name: nonEmptyString('QR Code Series name'),
    prefix: nonEmptyString('Prefix'),
    range: nonEmptyString('Range'),
    cluster: objectId,
    qr_codes: yup
        .array()
        .of(requiredObjectId)
        .optional(),
    is_in_use: yup.boolean().optional(),
    next_to_assign: yup.string().trim().nullable().optional(),
    generated_range: yup.string().trim().nullable().optional(),
    updatedBy: requiredObjectId,
    isActive: yup.boolean().optional(),
});