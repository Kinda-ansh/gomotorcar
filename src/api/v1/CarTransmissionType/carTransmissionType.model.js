import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const carTransmissionTypeSchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
            trim: true,
            get: (val) => getFormattedCode('CTT', val),
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            index: {
                unique: true,
                partialFilterExpression: { name: { $type: 'string' } },
            },
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

carTransmissionTypeSchema.methods.softDelete = async function (userId) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

carTransmissionTypeSchema.plugin(uniqueValidator, { message: '{PATH} should be unique.' });
carTransmissionTypeSchema.plugin(AutoIncrement, {
    inc_field: 'code',
    id: 'carTransmissionType',
});

const CarTransmissionType = model('CarTransmissionType', carTransmissionTypeSchema);
export default CarTransmissionType;


