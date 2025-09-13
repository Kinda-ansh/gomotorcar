import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const carCategorySchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
            trim: true,
            get: (val) => getFormattedCode('CC', val),
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true
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

carCategorySchema.methods.softDelete = async function (userId) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

// Unique name only among non-deleted documents
carCategorySchema.plugin(AutoIncrement, {
    inc_field: 'code',
    id: 'carCategory',
});

const CarCategory = model('CarCategory', carCategorySchema);
export default CarCategory;


