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

export const createCarSchema = yup.object({
    name: yup.string().required('Name is required').trim(),
    registrationNumber: yup.string().required('Registration Number is required').trim(),
    brand: objectId.required('Brand is required'),
    carModel: objectId.required('Car model is required'),
    carCategory: objectId.required('Car category is required'),
    carRegistrationType: objectId.required('Car registration type is required'),
    carTransmissionType: objectId.required('Car transmission type is required'),
    fuelType: objectId.required('Fuel type is required'),
    createdBy: objectId,
    updatedBy: objectId,
    isActive: yup.boolean().default(true),
});

export const updateCarSchema = yup.object({
    name: nonEmptyString('Name'),
    registrationNumber: nonEmptyString('Registration Number'),
    brand: objectId.optional(),
    carModel: objectId.optional(),
    carCategory: objectId.optional(),
    carRegistrationType: objectId.optional(),
    carTransmissionType: objectId.optional(),
    fuelType: objectId.optional(),
    updatedBy: objectId.required('UpdatedBy is required'),
    isActive: yup.boolean().optional(),
});



