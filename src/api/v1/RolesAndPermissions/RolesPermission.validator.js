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
  internalName: yup
    .string()
    .required('Internal name is required')
    .trim()
    .lowercase()
    .matches(/^[a-z0-9_-]+$/, 'Internal name must contain only lowercase letters, numbers, hyphens, and underscores'),
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
          .default([])
      })
    )
    .optional()
    .default([]),
  createdBy: objectId,
  updatedBy: objectId
});

export const updateRoleSchema = yup.object({
  name: nonEmptyString('Name'),
  internalName: yup
    .string()
    .optional()
    .trim()
    .lowercase()
    .matches(/^[a-z0-9_-]+$/, 'Internal name must contain only lowercase letters, numbers, hyphens, and underscores'),
  description: yup.string().optional().trim(),
  isDefault: yup.boolean().optional(),
  permissions: yup
    .array()
    .of(
      yup.object({
        module: yup.string().required('Permission module is required').trim(),
        actions: yup
          .array()
          .of(yup.string().oneOf(['create', 'view', 'edit', 'delete']))
          .default([])
      })
    )
    .optional(),
  updatedBy: objectId.required('UpdatedBy is required')
});
