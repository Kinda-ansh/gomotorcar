import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const qrCodeSchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
            trim: true,
            get: (val) => getFormattedCode('QR', val),
        },
        series: {
            type: Schema.Types.ObjectId,
            ref: 'QRCodeSeries',
            required: true,
        },
        assigned: {
            type: Boolean,
            default: false
        },
        printed: {
            type: Boolean,
            default: false
        },
        scanned: {
            type: Boolean,
            default: false
        },
       
        image_data: {
            type: String,
            default: null
        },
        generated_at: {
            type: Date,
            default: Date.now
        },
        generated_by: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        assigned_to: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        assigned_at: {
            type: Date,
            default: null
        },
        scanned_at: [{
            type: Date,
            default: null
        }],
        scanned_by: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }],
        printed_at: {
            type: Date,
            default: null
        },
        printed_by: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        metadata: {
            type: Map,
            of: String,
            default: {}
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

qrCodeSchema.methods.softDelete = async function (userId) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

// Unique code only among non-deleted documents
// Removed mongoose-unique-validator to avoid false positives with soft delete
qrCodeSchema.plugin(AutoIncrement, {
    inc_field: 'code',
    id: 'QRCode',
});

const QRCode = model('QRCode', qrCodeSchema);
export default QRCode;
