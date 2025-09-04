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

export const createRiverSchema = yup.object({
  name: yup.object({
    english: yup.string().required('English name is required').trim(),
    hindi: yup.string().trim().nullable(),
  }),
  shortName: yup.object({
    english: yup.string().trim().nullable(),
    hindi: yup.string().trim().nullable(),
  }),
  createdBy: objectId,
  updatedBy: objectId,
  isActive: yup.boolean().default(true),
});

export const updateRiverSchema = yup.object({
  name: yup
    .object({
      english: nonEmptyString('English name'),
      hindi: yup.string().trim().nullable(),
    })
    .optional(),
  shortName: yup
    .object({
      english: yup.string().trim().nullable(),
      hindi: yup.string().trim().nullable(),
    })
    .optional(),
  updatedBy: objectId.required('UpdatedBy is required'),
  isActive: yup.boolean().optional(),
});
