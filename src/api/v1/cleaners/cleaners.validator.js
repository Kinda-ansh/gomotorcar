import * as yup from 'yup';
import mongoose from 'mongoose';

const objectId = yup
  .string()
  .test('is-object-id', '${path} must be a valid MongoDB ObjectId', (value) =>
    value ? mongoose.Types.ObjectId.isValid(value) : true
  );

export const createCleanerValidation = yup.object().shape({
  // Basic Info (will be stored in User model)
  firstName: yup.string().trim().required('First name is required'),
  lastName: yup.string().trim().required('Last name is required'),
  mobile: yup.string().trim().required('Mobile number is required'),

  // Address Info
  address: yup.object().shape({
    source: yup.string().oneOf(['google_maps', 'manual']).optional(),
    line1: yup.string().trim().optional(),
    line2: yup.string().trim().optional(),
    area: yup.string().trim().optional(),
    city: yup.string().trim().optional(),
    pinCode: yup.string().trim().optional(),
    landmark: yup.string().trim().optional(),
    location: yup.object().shape({
      lat: yup.number().optional(),
      lng: yup.number().optional(),
    }).optional(),
  }).optional(),

  // Work Info
  work: yup.object().shape({
    servicePinCode: yup.string().trim().optional(),
    nearbyApartments: yup.array().of(yup.string().trim()).optional(),
  }).optional(),

  // Verification Info
  verification: yup.object().shape({
    photo: yup.string().trim().optional(),
    idProof: yup.object().shape({
      type: yup.string().oneOf(['aadhaar', 'pan', 'driving_license', 'voter_id', 'other']).optional(),
      documentNumber: yup.string().trim().optional(),
      documentFile: yup.string().trim().optional(),
    }).optional(),
  }).optional(),

  // Marketing Info
  referralSource: yup.string()
    .oneOf(['advertisement', 'internet', 'friend_reference', 'supervisor_reference', 'others'])
    .optional(),
});

export const updateCleanerValidation = yup.object().shape({
  // Basic Info
  firstName: yup.string().trim().optional(),
  lastName: yup.string().trim().optional(),

  // Address Info
  address: yup.object().shape({
    source: yup.string().oneOf(['google_maps', 'manual']).optional(),
    line1: yup.string().trim().optional(),
    line2: yup.string().trim().optional(),
    area: yup.string().trim().optional(),
    city: yup.string().trim().optional(),
    pinCode: yup.string().trim().optional(),
    landmark: yup.string().trim().optional(),
    location: yup.object().shape({
      lat: yup.number().optional(),
      lng: yup.number().optional(),
    }).optional(),
  }).optional(),

  // Work Info
  work: yup.object().shape({
    servicePinCode: yup.string().trim().optional(),
    nearbyApartments: yup.array().of(yup.string().trim()).optional(),
  }).optional(),

  // Verification Info
  verification: yup.object().shape({
    photo: yup.string().trim().optional(),
    idProof: yup.object().shape({
      type: yup.string().oneOf(['aadhaar', 'pan', 'driving_license', 'voter_id', 'other']).optional(),
      documentNumber: yup.string().trim().optional(),
      documentFile: yup.string().trim().optional(),
    }).optional(),
  }).optional(),

  // Marketing Info
  referralSource: yup.string()
    .oneOf(['advertisement', 'internet', 'friend_reference', 'supervisor_reference', 'others'])
    .optional(),
});

export const updateApprovalStatusValidation = yup.object().shape({
  approvalStatus: yup.string()
    .oneOf(['pending', 'approved', 'rejected', 'queried'])
    .required('Approval status is required'),
  queriedComment: yup.string().trim().when('approvalStatus', {
    is: 'queried',
    then: (schema) => schema.required('Comment is required when querying'),
    otherwise: (schema) => schema.optional(),
  }),
});