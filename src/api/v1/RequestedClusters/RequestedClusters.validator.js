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

const mobileNo = yup
    .string()
    .matches(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits')
    .required('Mobile number is required');

export const createRequestedClusterSchema = yup.object({
    apartmentName: yup.string().required('Apartment Name is required').trim(),
    residenceType: objectId.required('Residence Type is required'),
    customerName: yup.string().required('Customer Name is required').trim(),
    mobileNo: mobileNo,
    roleDesignation: nonEmptyString('Role/Designation'),
    comments: yup.string().trim().optional().default(''),
    confirmation: yup.boolean().default(false),
    createdBy: objectId.required('CreatedBy is required'),
    updatedBy: objectId.required('UpdatedBy is required'),
    isActive: yup.boolean().default(true),
});

export const updateRequestedClusterSchema = yup.object({
    apartmentName: nonEmptyString('Apartment Name'),
    residenceType: objectId.optional(),
    customerName: nonEmptyString('Customer Name'),
    mobileNo: yup
        .string()
        .matches(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits')
        .optional(),
    roleDesignation: nonEmptyString('Role/Designation'),
    comments: yup.string().trim().optional(),
    confirmation: yup.boolean().optional(),
    updatedBy: objectId.required('UpdatedBy is required'),
    isActive: yup.boolean().optional(),
});