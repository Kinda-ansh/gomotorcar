import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const carSchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
            trim: true,
            get: (val) => getFormattedCode('CAR', val),
        },
        // name: {
        //     type: String,
        //     required: [true, 'Name is required'],
        //     trim: true
        // },
        registrationNumber: {
            type: String,
            required: [true, 'Registration Number is required'],
            trim: true,
            index: true,
        },
        // brand: {
        //     type: Schema.Types.ObjectId,
        //     ref: 'Brand',
        //     required: true,
        // },
        carModel: {
            type: Schema.Types.ObjectId,
            ref: 'CarModel',
            required: true,
        },
        // carCategory: {
        //     type: Schema.Types.ObjectId,
        //     ref: 'CarCategory',
        //     required: true,
        // },
        carRegistrationType: {
            type: Schema.Types.ObjectId,
            ref: 'CarRegistrationType',
            required: true,
        },
        carTransmissionType: {
            type: Schema.Types.ObjectId,
            ref: 'CarTransmissionType',
            required: true,
        },
        fuelType: {
            type: Schema.Types.ObjectId,
            ref: 'FuelType',
            required: true,
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

carSchema.methods.softDelete = async function (userId) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

carSchema.index({ registrationNumber: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
carSchema.plugin(uniqueValidator, { message: '{PATH} should be unique.' });
carSchema.plugin(AutoIncrement, {
    inc_field: 'code',
    id: 'cars',
});

const Cars = model('Cars', carSchema);
export default Cars;



