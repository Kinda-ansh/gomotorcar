import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const fuelTypeSchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
            trim: true,
            get: (val) => getFormattedCode('FT', val),
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true
        },
        image: {
            type: String,
            trim: true,
            default: null,
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

fuelTypeSchema.methods.softDelete = async function (userId) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

// Unique name only among non-deleted documents
fuelTypeSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
// Removed mongoose-unique-validator to avoid false positives with soft delete
fuelTypeSchema.plugin(AutoIncrement, {
    inc_field: 'code',
    id: 'fuelType',
});

const FuelType = model('FuelType', fuelTypeSchema);
export default FuelType;


