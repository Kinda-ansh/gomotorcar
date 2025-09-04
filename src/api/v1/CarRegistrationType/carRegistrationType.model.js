import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const carRegistrationTypeSchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
            trim: true,
            get: (val) => getFormattedCode('CRT', val),
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

carRegistrationTypeSchema.methods.softDelete = async function (userId) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

carRegistrationTypeSchema.plugin(uniqueValidator, { message: '{PATH} should be unique.' });
carRegistrationTypeSchema.plugin(AutoIncrement, {
    inc_field: 'code',
    id: 'carRegistrationType',
});

const CarRegistrationType = model('CarRegistrationType', carRegistrationTypeSchema);
export default CarRegistrationType;


