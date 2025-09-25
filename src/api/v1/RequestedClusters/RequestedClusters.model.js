import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const requestedClusterSchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
            trim: true,
            get: (val) => getFormattedCode('RCL', val), 
        },
        apartmentName: {
            type: String,
            required: [true, 'Apartment Name is required'],
            trim: true
        },
        residenceType: {
            type: Schema.Types.ObjectId,
            ref: 'ResidenceType',
            required: true,
        },
        customerName: {
            type: String,
            required: [true, 'Customer Name is required'],
            trim: true
        },
        mobileNo: {
            type: String,
            required: [true, 'Mobile Number is required'],
            trim: true,
           
        },
        roleDesignation: {
            type: String,
            trim: true
        },
        comments: {
            type: String,
            trim: true,
            default: ''
        },
        confirmation: {
            type: Boolean,
            default: false
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

requestedClusterSchema.methods.softDelete = async function (userId) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

// Index for better query performance
requestedClusterSchema.index({ mobileNo: 1 });

requestedClusterSchema.plugin(uniqueValidator, { message: '{PATH} should be unique.' });
requestedClusterSchema.plugin(AutoIncrement, {
    inc_field: 'code',
    id: 'requested_clusters',
});

const RequestedClusters = model('RequestedClusters', requestedClusterSchema);
export default RequestedClusters;