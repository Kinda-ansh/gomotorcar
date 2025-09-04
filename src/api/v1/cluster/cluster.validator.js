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

const geoLocationSchema = yup.object({
    lat: yup.number().required('Latitude is required'),
    long: yup.number().required('Longitude is required')
});

const addressSchema = yup.object({
    line_1: yup.string().required('Address line 1 is required').trim(),
    line_2: yup.string().trim().nullable(),
    area: yup.string().required('Area is required').trim(),
    city: yup.string().required('City is required').trim(),
    state: yup.string().required('State is required').trim(),
    country: yup.string().trim().default('India'),
    zip_code: yup.number().required('Zip code is required').positive('Zip code must be positive'),
    geoLocation: geoLocationSchema.required('Geo location is required')
});

// Optional address schema for updates - all fields optional
const optionalAddressSchema = yup.object({
    line_1: yup.string().trim().optional(),
    line_2: yup.string().trim().nullable().optional(),
    area: yup.string().trim().optional(),
    city: yup.string().trim().optional(),
    state: yup.string().trim().optional(),
    country: yup.string().trim().optional(),
    zip_code: yup.number().positive('Zip code must be positive').optional(),
    geoLocation: yup.object({
        lat: yup.number().min(-90).max(90).optional(),
        long: yup.number().min(-180).max(180).optional()
    }).optional()
}).optional();

const approvalStatusSchema = yup.object({
    status: yup.string().oneOf(['pending', 'approved', 'rejected']).default('pending'),
    rejection_reason: yup.string().when('status', {
        is: 'rejected',
        then: (schema) => schema.required('Rejection reason is required when status is rejected'),
        otherwise: (schema) => schema.nullable()
    })
});

export const createClusterSchema = yup.object({
    name: yup.string().required('Name is required').trim(),
    address: addressSchema.required('Address is required'),
    image: yup.string().trim().nullable(),
    off_days: yup.array().of(
        yup.string().oneOf(["NONE", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"])
    ).default(["NONE"]),
    time_slot: yup.string().trim().nullable(),
    residence_type: yup.string().required('Residence type is required').test('is-object-id', 'Residence type must be a valid MongoDB ObjectId', (value) =>
        value ? mongoose.Types.ObjectId.isValid(value) : false
    ),
    approval_status: approvalStatusSchema.default(() => ({ status: 'pending' })),
    createdBy: objectId,
    updatedBy: objectId,
    isActive: yup.boolean().default(true),
});

// Minimal schema for approval/rejection operations
export const approvalUpdateSchema = yup.object({
    approval_status: approvalStatusSchema.required('Approval status is required'),
    updatedBy: yup.string().optional().test('is-object-id', 'UpdatedBy must be a valid MongoDB ObjectId', (value) =>
        value ? mongoose.Types.ObjectId.isValid(value) : true
    ),
});

export const updateClusterSchema = yup.object({
    name: yup.string().trim().optional(),
    address: optionalAddressSchema,
    image: yup.string().trim().nullable().optional(),
    off_days: yup.array().of(
        yup.string().oneOf(["NONE", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"])
    ).optional(),
    time_slot: yup.string().trim().nullable().optional(),
    residence_type: yup.string().optional().test('is-object-id', 'Residence type must be a valid MongoDB ObjectId', (value) =>
        value ? mongoose.Types.ObjectId.isValid(value) : true
    ),
    approval_status: approvalStatusSchema.optional(),
    updatedBy: yup.string().optional().test('is-object-id', 'UpdatedBy must be a valid MongoDB ObjectId', (value) =>
        value ? mongoose.Types.ObjectId.isValid(value) : true
    ),
    isActive: yup.boolean().optional(),
});
