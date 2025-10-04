import * as yup from 'yup';
import mongoose from 'mongoose';

const requiredObjectId = yup
    .string()
    .required('${path} is required')
    .test('is-object-id', '${path} must be a valid MongoDB ObjectId', (value) =>
        mongoose.Types.ObjectId.isValid(value)
    );

// Generate QR Codes Schema
export const generateQRCodesSchema = yup.object({
    series: requiredObjectId,
    range: yup
        .string()
        .required('Range is required')
        .trim()
        .test('valid-range', 'Range must be in format "start-end" (e.g., "1-100")', (value) => {
            if (!value) return false;
            const parts = value.split('-');
            if (parts.length !== 2) return false;
            const start = parseInt(parts[0]);
            const end = parseInt(parts[1]);
            return !isNaN(start) && !isNaN(end) && start > 0 && end > 0 && end >= start;
        }),
});

// Print QR Codes Schema
export const printQRCodesSchema = yup.object({
    series: requiredObjectId,
    range: yup
        .string()
        .required('Range is required')
        .trim()
        .test('valid-range', 'Range must be in format "start-end" (e.g., "1-100")', (value) => {
            if (!value) return false;
            const parts = value.split('-');
            if (parts.length !== 2) return false;
            const start = parseInt(parts[0]);
            const end = parseInt(parts[1]);
            return !isNaN(start) && !isNaN(end) && start > 0 && end > 0 && end >= start;
        }),
});
