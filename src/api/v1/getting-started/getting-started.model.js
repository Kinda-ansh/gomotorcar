import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const GettingstartedSchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
            trim: true,
            get: (val) => getFormattedCode('GS', val),
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true
        },

        route: {
            type: String,
            required: [true, 'Name is required'],
            trim: true
        },
        priority: {
            type: Number,

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

GettingstartedSchema.methods.softDelete = async function (userId) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

// Removed mongoose-unique-validator to avoid false positives with soft delete
GettingstartedSchema.plugin(AutoIncrement, {
    inc_field: 'code',
    id: 'gettingstarted',
});

const Gettingstarted = model('Gettingstarted', GettingstartedSchema);
export default Gettingstarted;

