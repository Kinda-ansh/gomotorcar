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

export const createRoleSchema = yup.object({
  name: yup.string().required('Name is required').trim(),
  level: yup
    .string()
    .oneOf(['country', 'village', 'tehsil', 'district', 'state', 'own'])
    .required('Level is required')
    .trim(),
  description: yup.string().trim().optional(),
  isDefault: yup.boolean().default(false),
  permissions: yup
    .array()
    .of(
      yup.object({
        module: yup.string().required('Permission module is required').trim(),
        actions: yup
          .array()
          .of(yup.string().oneOf(['create', 'view', 'edit', 'delete']))
          .default([]),
        level: yup
          .string()
          .oneOf(['village', 'tehsil', 'district', 'state', 'own'])
          .optional(),
      })
    )
    .default([]),
  createdBy: objectId,
  updatedBy: objectId
});

export const updateRoleSchema = yup.object({
  name: nonEmptyString('Name').optional(),
  level: yup
    .string()
    .oneOf(['country', 'village', 'tehsil', 'district', 'state', 'own'])
    .optional()
    .trim(),
  description: yup.string().optional().trim(),
  isDefault: yup.boolean().default(false),
  permissions: yup
    .array()
    .of(
      yup.object({
        module: yup.string().required('Permission module is required').trim(),
        actions: yup
          .array()
          .of(yup.string().oneOf(['create', 'view', 'edit', 'delete']))
          .default([]),
        level: yup
          .string()
          .oneOf(['village', 'tehsil', 'district', 'state', 'own'])
          .optional(),
      })
    )
    .optional(),
  updatedBy: objectId.required('UpdatedBy is required'),
});
