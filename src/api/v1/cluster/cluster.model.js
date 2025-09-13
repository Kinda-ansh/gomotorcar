import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const geoLocationSchema = new Schema({
    lat: {
        type: Number,
        required: [true, "Latitude is required."]
    },
    long: {
        type: Number,
        required: [true, "Longitude is required."]
    }
}, { _id: false });

const clusterAddressSchema = new Schema({
    line_1: {
        type: String,
        required: [true, "Address is required."]
    },
    line_2: {
        type: String,
    },
    area: {
        type: String,
        required: [true, "Area is required."]
    },
    city: {
        type: String,
        required: [true, "City is required."]
    },
    state: {
        type: String,
        required: [true, "State is required."]
    },
    country: {
        type: String,
        default: "India"
    },
    zip_code: {
        type: Number,
        required: [true, "Zip code is required."]
    },
    geoLocation: {
        type: geoLocationSchema,
        required: [true, "Geo location is required."]
    }
}, { _id: false });

const approvalStatusSchema = new Schema({
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    rejection_reason: {
        type: String,
        required: function () {
            return this.status === 'rejected';
        }
    }
}, { _id: false });

const clusterSchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
            trim: true,
            get: (val) => getFormattedCode('CL', val),
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true
        },
        address: {
            type: clusterAddressSchema,
            required: [true, 'Address is required']
        },
        image: {
            type: String,
            trim: true,
            default: null,
        },
        off_days: [{
            type: String,
            enum: ["NONE", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
            default: "NONE"
        }],
        time_slot: {
            type: String,
            trim: true
        },
        residence_type: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ResidenceType',
            required: [true, "Cluster residence type is required."]
        },
        approval_status: {
            type: approvalStatusSchema,
            default: () => ({ status: 'pending' })
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        isActive: { type: Boolean, default: true },
        deletedAt: {
            type: Date,
            default: null,
        },
        deletedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { getters: true },
    }
);

clusterSchema.methods.softDelete = async function (userId) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

// Removed mongoose-unique-validator to avoid false positives with soft delete
clusterSchema.plugin(AutoIncrement, {
    inc_field: 'code',
    id: 'cluster',
});

const Cluster = model('Cluster', clusterSchema);
export default Cluster;

