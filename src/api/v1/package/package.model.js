import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

// Sub-schema for Cleaner Payment Rate
const cleanerPaymentRateSchema = new Schema({
    internalCleaning: {
        type: Number,
        required: [true, 'Internal cleaning payment rate is required'],
        min: [0, 'Internal cleaning payment rate cannot be negative']
    },
    externalCleaning: {
        type: Number,
        required: [true, 'External cleaning payment rate is required'],
        min: [0, 'External cleaning payment rate cannot be negative']
    }
}, { _id: false });

// Sub-schema for Customer Refund Rate
const customerRefundRateSchema = new Schema({
    internalCleaning: {
        type: Number,
        required: [true, 'Internal cleaning refund rate is required'],
        min: [0, 'Internal cleaning refund rate cannot be negative']
    },
    externalCleaning: {
        type: Number,
        required: [true, 'External cleaning refund rate is required'],
        min: [0, 'External cleaning refund rate cannot be negative']
    }
}, { _id: false });

// Sub-schema for Tax Details
const taxDetailsSchema = new Schema({
    taxApplicable: {
        type: Boolean,
        default: false
    },
    taxName: {
        type: String,
        trim: true,
        default: null,
        required: function () {
            return this.taxApplicable === true;
        }
    },
    taxRate: {
        type: Number,
        min: [0, 'Tax rate cannot be negative'],
        max: [100, 'Tax rate cannot exceed 100%'],
        default: 0,
        required: function () {
            return this.taxApplicable === true;
        }
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

// Main Package Schema
const packageSchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
            trim: true,
            get: (val) => getFormattedCode('PKG', val),
        },
        name: {
            type: String,
            required: [true, 'Package name is required'],
            trim: true
        },
        internalName: {
            type: String,
            required: [true, 'Internal name is required'],
            trim: true
        },
        cluster: {
            type: Schema.Types.ObjectId,
            ref: 'Cluster',
            default: null
        },
        carCategory: {
            type: Schema.Types.ObjectId,
            ref: 'CarCategory',
            required: [true, 'Car category is required']
        },
        strikeOffPrice: {
            type: Number,
            required: [true, 'Strike off price is required'],
            min: [0, 'Strike off price cannot be negative']
        },
        actualPrice: {
            type: Number,
            required: [true, 'Actual price is required'],
            min: [0, 'Actual price cannot be negative'],
            validate: {
                validator: function (value) {
                    return value <= this.strikeOffPrice;
                },
                message: 'Actual price cannot exceed strike off price'
            }
        },
        taxAmount: {
            type: Number,
            default: 0,
            min: [0, 'Tax amount cannot be negative']
        },
        totalAmount: {
            type: Number,
            default: 0,
            min: [0, 'Total amount cannot be negative']
        },
        packageStatus: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
            lowercase: true
        },
        noOfDays: {
            type: Number,
            required: [true, 'Number of days is required'],
            min: [1, 'Number of days must be at least 1']
        },
        usageStatus: {
            type: String,
            enum: ['available', 'unavailable',],
            default: 'available',
            lowercase: true
        },
        taxDetails: {
            type: taxDetailsSchema,
            default: () => ({ taxApplicable: false, taxRate: 0 })
        },
        cleanerPaymentRate: {
            type: cleanerPaymentRateSchema,
            required: [true, 'Cleaner payment rate is required']
        },
        customerRefundRate: {
            type: customerRefundRateSchema,
            required: [true, 'Customer refund rate is required']
        },
        description: {
            type: String,
            trim: true,
            default: null
        },
        features: [{
            type: String,
            trim: true
        }],
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
        isActive: {
            type: Boolean,
            default: true
        },
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

// Pre-save middleware to calculate tax amount and total amount
packageSchema.pre('save', function (next) {
    if (this.taxDetails.taxApplicable && this.taxDetails.taxRate > 0) {
        this.taxAmount = (this.actualPrice * this.taxDetails.taxRate) / 100;
    } else {
        this.taxAmount = 0;
    }

    this.totalAmount = this.actualPrice + this.taxAmount;
    next();
});

// Pre-findOneAndUpdate middleware to calculate tax and total on update
packageSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();
    const setData = update.$set || update;

    if (setData.actualPrice !== undefined ||
        setData['taxDetails.taxApplicable'] !== undefined ||
        setData['taxDetails.taxRate'] !== undefined) {

        const taxApplicable = setData['taxDetails.taxApplicable'] !== undefined
            ? setData['taxDetails.taxApplicable']
            : (setData.taxDetails && setData.taxDetails.taxApplicable);

        const taxRate = setData['taxDetails.taxRate'] !== undefined
            ? setData['taxDetails.taxRate']
            : (setData.taxDetails && setData.taxDetails.taxRate);

        const actualPrice = setData.actualPrice;

        if (actualPrice !== undefined && taxApplicable && taxRate > 0) {
            setData.taxAmount = (actualPrice * taxRate) / 100;
            setData.totalAmount = actualPrice + setData.taxAmount;
        } else if (actualPrice !== undefined) {
            setData.taxAmount = 0;
            setData.totalAmount = actualPrice;
        }
    }

    next();
});

// Soft delete method
packageSchema.methods.softDelete = async function (userId) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

// Indexes for better query performance
packageSchema.index({ name: 1 });
packageSchema.index({ cluster: 1 });
packageSchema.index({ carCategory: 1 });
packageSchema.index({ packageStatus: 1 });
packageSchema.index({ deletedAt: 1 });
packageSchema.index({ createdAt: -1 });

// Compound index for common queries
packageSchema.index({ cluster: 1, carCategory: 1, packageStatus: 1, deletedAt: 1 });

// Auto-increment plugin
packageSchema.plugin(AutoIncrement, {
    inc_field: 'code',
    id: 'package',
});

const Package = model('Package', packageSchema);
export default Package;

