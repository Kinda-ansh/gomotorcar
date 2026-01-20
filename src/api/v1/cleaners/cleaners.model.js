
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const cleanerSchema = new Schema(
  {
    // Link to User (name and mobile stored in User model)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    /* ---------------- Approval Workflow ---------------- */
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'queried'],
      default: 'pending'
    },
    queriedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    queriedComment: {
      type: String,
      trim: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    /* ---------------- Basic Info (also stored in User.name) ---------------- */
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true, required: true },

    /* ---------------- Address Info ---------------- */
    address: {
      source: {
        type: String,
        enum: ['google_maps', 'manual'],
      },
      line1: { type: String, trim: true }, // House no
      line2: { type: String, trim: true }, // Locality
      area: { type: String, trim: true },
      city: { type: String, trim: true },
      pinCode: { type: String, trim: true },
      landmark: { type: String, trim: true },
      location: {
        lat: Number,
        lng: Number,
      },
    },

    /* ---------------- Work Info ---------------- */
    work: {
      servicePinCode: { type: String, trim: true },
      nearbyApartments: [{ type: String, trim: true }],
    },

    /* ---------------- Verification Info ---------------- */
    verification: {
      photo: { type: String, trim: true },

      idProof: {
        type: {
          type: String,
          enum: ['aadhaar', 'pan', 'driving_license', 'voter_id', 'other'],
        },
        documentNumber: { type: String, trim: true },
        documentFile: { type: String, trim: true },
      },
    },

    /* ---------------- Marketing Info ---------------- */
    referralSource: {
      type: String,
      enum: [
        'advertisement',
        'internet',
        'friend_reference',
        'supervisor_reference',
        'others',
      ],
    },
  },

  {
    toJSON: { getters: true },
    timestamps: true,
  }
);

const Cleaner = model('Cleaner', cleanerSchema);

export default Cleaner;
