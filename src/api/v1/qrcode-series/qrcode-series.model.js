import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const qrCodeSeriesSchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
            trim: true,
            get: (val) => getFormattedCode('SRS', val),
        },
        name: {
            type: String, required: [true, "QR Code Series name is required."],
            unique: true,
            trim: true
        },
        prefix: { type: String, required: true },
        range: {
            type: String,
            trim: true,
            required: [true, "QR Code Series Range is required."]
        },
        cluster: {
            type: Schema.Types.ObjectId,
            ref: 'Cluster',
            required: true,
        },
        qr_codes: [{
            type: Schema.Types.ObjectId,
            ref: 'QRCode',
            required: true,
        }],
        is_in_use: {
            type: Boolean,
            default: false
        },
        next_to_assign: {
            type: String,
            default: null
        },
       
        generated_range: {
            type: String,
            default: null
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

qrCodeSeriesSchema.methods.softDelete = async function (userId) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

// Unique code only among non-deleted documents
// Removed mongoose-unique-validator to avoid false positives with soft delete
qrCodeSeriesSchema.plugin(AutoIncrement, {
    inc_field: 'code',
    id: 'qrCodeSeries',
});

const QRCodeSeries = model('QRCodeSeries', qrCodeSeriesSchema);
export default QRCodeSeries;
