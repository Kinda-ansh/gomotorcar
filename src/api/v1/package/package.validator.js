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

// Cleaner Payment Rate Schema
const cleanerPaymentRateSchema = yup.object({
    internalCleaning: yup
        .number()
        .min(0, 'Internal cleaning payment rate cannot be negative')
        .required('Internal cleaning payment rate is required'),
    externalCleaning: yup
        .number()
        .min(0, 'External cleaning payment rate cannot be negative')
        .required('External cleaning payment rate is required')
});

// Customer Refund Rate Schema
const customerRefundRateSchema = yup.object({
    internalCleaning: yup
        .number()
        .min(0, 'Internal cleaning refund rate cannot be negative')
        .required('Internal cleaning refund rate is required'),
    externalCleaning: yup
        .number()
        .min(0, 'External cleaning refund rate cannot be negative')
        .required('External cleaning refund rate is required')
});

// Category Pricing Schema
const categoryPricingSchema = yup.object({
    carCategory: requiredObjectId,
    strikeOffPrice: yup
        .number()
        .min(0, 'Strike off price cannot be negative')
        .required('Strike off price is required'),
    actualPrice: yup
        .number()
        .min(0, 'Actual price cannot be negative')
        .required('Actual price is required')
        .test('price-comparison', 'Actual price cannot exceed strike off price', function (value) {
            const { strikeOffPrice } = this.parent;
            return value <= strikeOffPrice;
        }),
    taxAmount: yup
        .number()
        .min(0, 'Tax amount cannot be negative')
        .optional(),
    totalAmount: yup
        .number()
        .min(0, 'Total amount cannot be negative')
        .optional(),
    cleanerPaymentRate: cleanerPaymentRateSchema.required('Cleaner payment rate is required'),
    customerRefundRate: customerRefundRateSchema.required('Customer refund rate is required')
});

// Tax Details Schema
const taxDetailsSchema = yup.object({
    taxApplicable: yup.boolean().default(false),
    taxName: yup
        .string()
        .trim()
        .nullable()
        .when('taxApplicable', {
            is: true,
            then: (schema) => schema.required('Tax name is required when tax is applicable'),
            otherwise: (schema) => schema.notRequired()
        }),
    taxRate: yup
        .number()
        .min(0, 'Tax rate cannot be negative')
        .max(100, 'Tax rate cannot exceed 100%')
        .when('taxApplicable', {
            is: true,
            then: (schema) => schema.required('Tax rate is required when tax is applicable'),
            otherwise: (schema) => schema.default(0)
        })
});

// Create Package Validation Schema
export const createPackageSchema = yup.object({
    name: yup
        .string()
        .trim()
        .required('Package name is required'),
    internalName: yup
        .string()
        .trim()
        .required('Internal name is required'),
    cluster: objectId,
    categoryPricing: yup
        .array()
        .of(categoryPricingSchema)
        .min(1, 'At least one category pricing is required')
        .required('Category pricing is required')
        .test('unique-categories', 'Duplicate car categories are not allowed', function (value) {
            if (!value || value.length === 0) return true;
            const categories = value.map(item => item.carCategory);
            const uniqueCategories = new Set(categories);
            return categories.length === uniqueCategories.size;
        }),
    packageStatus: yup
        .string()
        .oneOf(['active', 'inactive'], 'Package status must be either active or inactive')
        .default('active')
        .lowercase(),
    noOfDays: yup
        .number()
        .integer('Number of days must be an integer')
        .min(1, 'Number of days must be at least 1')
        .required('Number of days is required'),
    usageStatus: yup
        .string()
        .oneOf(['available', 'unavailable', 'limited'], 'Invalid usage status')
        .default('available')
        .lowercase(),
    taxDetails: taxDetailsSchema.default(() => ({ taxApplicable: false, taxRate: 0 })),
    description: yup
        .string()
        .trim()
        .nullable()
        .notRequired(),
    features: yup
        .array()
        .of(yup.string().trim())
        .notRequired(),
    createdBy: objectId,
    updatedBy: objectId,
    isActive: yup.boolean().default(true),
});

// Approval Status Schema
const approvalStatusSchema = yup.object({
    status: yup
        .string()
        .oneOf(['pending', 'approved', 'rejected'], 'Invalid approval status')
        .optional(),
    rejection_reason: yup
        .string()
        .trim()
        .when('status', {
            is: 'rejected',
            then: (schema) => schema.required('Rejection reason is required when status is rejected'),
            otherwise: (schema) => schema.notRequired()
        })
});

// Update Package Validation Schema
export const updatePackageSchema = yup.object({
    name: nonEmptyString('Package name'),
    internalName: nonEmptyString('Internal name'),
    cluster: objectId,
    categoryPricing: yup
        .array()
        .of(categoryPricingSchema)
        .min(1, 'At least one category pricing is required')
        .optional()
        .test('unique-categories', 'Duplicate car categories are not allowed', function (value) {
            if (!value || value.length === 0) return true;
            const categories = value.map(item => item.carCategory);
            const uniqueCategories = new Set(categories);
            return categories.length === uniqueCategories.size;
        }),
    packageStatus: yup
        .string()
        .oneOf(['active', 'inactive'], 'Package status must be either active or inactive')
        .lowercase()
        .optional(),
    noOfDays: yup
        .number()
        .integer('Number of days must be an integer')
        .min(1, 'Number of days must be at least 1')
        .optional(),
    usageStatus: yup
        .string()
        .oneOf(['available', 'unavailable', 'limited'], 'Invalid usage status')
        .lowercase()
        .optional(),
    taxDetails: taxDetailsSchema.optional(),
    description: yup
        .string()
        .trim()
        .nullable()
        .notRequired(),
    features: yup
        .array()
        .of(yup.string().trim())
        .optional(),
    approval_status: approvalStatusSchema.optional(),
    updatedBy: objectId.required('UpdatedBy is required'),
    isActive: yup.boolean().optional(),
});

