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

// Schema for individual generated codes within the QR code series
const generatedCodeSchema = yup.object({
    serial: yup.number().required('Serial number is required').positive('Serial must be positive'),
    startingQrCodeId: yup.string().required('Starting QR code ID is required').trim(),
    endingQrCodeId: yup.string().required('Ending QR code ID is required').trim(),
    stickerTrackingNo: yup.string().trim().optional(),
    status: yup.string().oneOf(['unused', 'printed', 'assigned', 'scanned'], 'Status must be one of: unused, printed, assigned, scanned').default('unused'),
    printedAt: yup.date().optional().nullable(),
    printedBy: yup.string().trim().optional(),
});

export const createQRCodeSchema = yup.object({
    prefix: yup.string().required('Prefix is required').trim(),
    city: yup.string().required('City is required').trim(),
    apartmentName: yup.string().required('Apartment name is required').trim(),
    apartmentCode: yup.string().required('Apartment code is required').trim(),
    qrCodeSeries: yup.string().required('QR code series is required').trim(),
    qrCodeSeriesStart: yup
        .number()
        .required('QR code series start is required')
        .integer('Series start must be an integer')
        .min(0, 'Series start must be 0 or greater'),
    qrCodeSeriesEnd: yup
        .number()
        .required('QR code series end is required')
        .integer('Series end must be an integer')
        .min(0, 'Series end must be 0 or greater')
        .test('is-greater-than-start', 'Series end must be greater than series start', function (value) {
            const { qrCodeSeriesStart } = this.parent;
            return value > qrCodeSeriesStart;
        }),
    qrCodePicture: yup.string().trim().optional(),
    generatedCodes: yup
        .array()
        .of(generatedCodeSchema)
        .optional()
        .default([]),
    createdBy: objectId.required('CreatedBy is required'),
    updatedBy: objectId.required('UpdatedBy is required'),
    isActive: yup.boolean().default(true),
});

export const updateQRCodeSchema = yup.object({
    prefix: nonEmptyString('Prefix'),
    city: nonEmptyString('City'),
    apartmentName: nonEmptyString('Apartment name'),
    apartmentCode: nonEmptyString('Apartment code'),
    qrCodeSeries: nonEmptyString('QR code series'),
    qrCodeSeriesStart: yup
        .number()
        .integer('Series start must be an integer')
        .min(0, 'Series start must be 0 or greater')
        .optional(),
    qrCodeSeriesEnd: yup
        .number()
        .integer('Series end must be an integer')
        .min(0, 'Series end must be 0 or greater')
        .optional()
        .test('is-greater-than-start', 'Series end must be greater than series start', function (value) {
            const { qrCodeSeriesStart } = this.parent;
            if (qrCodeSeriesStart !== undefined && value !== undefined) {
                return value > qrCodeSeriesStart;
            }
            return true;
        }),
    qrCodePicture: yup.string().trim().optional(),
    generatedCodes: yup
        .array()
        .of(generatedCodeSchema)
        .optional(),
    updatedBy: objectId.required('UpdatedBy is required'),
    isActive: yup.boolean().optional(),
});

// Schema for updating individual generated codes
export const updateGeneratedCodeSchema = yup.object({
    serial: yup.number().positive('Serial must be positive').optional(),
    startingQrCodeId: nonEmptyString('Starting QR code ID'),
    endingQrCodeId: nonEmptyString('Ending QR code ID'),
    stickerTrackingNo: yup.string().trim().optional(),
    status: yup.string().oneOf(['unused', 'printed', 'assigned', 'scanned'], 'Status must be one of: unused, printed, assigned, scanned').optional(),
    printedAt: yup.date().optional().nullable(),
    printedBy: yup.string().trim().optional(),
});

// Schema for bulk status update of generated codes
export const bulkUpdateStatusSchema = yup.object({
    serials: yup
        .array()
        .of(yup.number().positive('Serial must be positive'))
        .required('Serials array is required')
        .min(1, 'At least one serial number is required'),
    status: yup
        .string()
        .oneOf(['unused', 'printed', 'assigned', 'scanned'], 'Status must be one of: unused, printed, assigned, scanned')
        .required('Status is required'),
    printedBy: yup.string().trim().when('status', {
        is: 'printed',
        then: (schema) => schema.required('PrintedBy is required when status is printed'),
        otherwise: (schema) => schema.optional()
    }),
    updatedBy: objectId.required('UpdatedBy is required'),
});
