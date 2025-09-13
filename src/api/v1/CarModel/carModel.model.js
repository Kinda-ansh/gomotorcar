import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const carModelSchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
            trim: true,
            get: (val) => getFormattedCode('CM', val),
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true
        },
        brand: {
            type: Schema.Types.ObjectId,
            ref: 'Brand',
            required: true,
        },
        carCategory: {
            type: Schema.Types.ObjectId,
            ref: 'CarCategory',
            required: true,
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

carModelSchema.methods.softDelete = async function (userId) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

// Removed mongoose-unique-validator to avoid false positives with soft delete
carModelSchema.plugin(AutoIncrement, {
    inc_field: 'code',
    id: 'carModel',
});

const CarModel = model('CarModel', carModelSchema);
export default CarModel;


