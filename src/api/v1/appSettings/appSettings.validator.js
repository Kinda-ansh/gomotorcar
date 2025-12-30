import * as yup from 'yup';
import mongoose from 'mongoose';

const objectId = yup
    .string()
    .nullable()
    .notRequired()
    .test('is-object-id', '${path} must be a valid MongoDB ObjectId', (value) =>
        value ? mongoose.Types.ObjectId.isValid(value) : true
    );

export const createOnboardingScreenSchema = yup.object({
    title: yup.string().required('Title is required').trim(),
    description: yup.string().optional(),
    priority: yup.number().optional(),
    image: yup.string().required('Image is required').trim(),
    createdBy: objectId,
    updatedBy: objectId,
    isActive: yup.boolean().default(true),
});

export const updateOnboardingScreenSchema = yup.object({
    title: yup.string().trim().optional(),
    description: yup.string().trim().optional(),
    priority: yup.number().optional(),
    image: yup.string().trim().nullable(),
    updatedBy: objectId.required('UpdatedBy is required'),
    isActive: yup.boolean().optional(),
});

export const createHomeScreenCarouselSchema = yup.object({
    title: yup.string().required('Title is required').trim(),
    priority: yup.number().optional(),
    image: yup.string().required('Image is required').trim(),
    navigationRoute: yup.string().trim().optional(),
    createdBy: objectId,
    updatedBy: objectId,
    isActive: yup.boolean().default(true),
});

export const updateHomeScreenCarouselSchema = yup.object({
    title: yup.string().trim().optional(),
    priority: yup.number().optional(),
    image: yup.string().trim().nullable(),
    navigationRoute: yup.string().trim().optional(),
    updatedBy: objectId.required('UpdatedBy is required'),
    isActive: yup.boolean().optional(),
});
