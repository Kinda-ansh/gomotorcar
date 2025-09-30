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
        prefix: { type: String, required: true },
        city: { type: String, trim: true },
        apartmentName: { type: String, trim: true },
        apartmentCode: { type: String, trim: true },
        qrCodeSeries: { type: String, trim: true },
        qrCodeSeriesStart: { type: Number, trim: true },
        qrCodeSeriesEnd: { type: Number, trim: true },
        qrCodePicture: { type: String },
        generatedCodes: [
            {
                serial: { type: Number, required: true },
                startingQrCodeId: { type: String, required: true },
                endingQrCodeId: { type: String, required: true },
                stickerTrackingNo: { type: String },

                status: {
                    type: String,
                    enum: ["unused", "printed", "assigned", "scanned"],
                    default: "unused",
                },
                printedAt: { type: Date },
                printedBy: { type: String },
            },
        ],
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
    id: 'qrCodeSeries',
});

const QRCodeSeries = model('QRCodeSeries', qrCodeSchema);
export default QRCodeSeries;
