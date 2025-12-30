import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const onboardingScreenSchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
            trim: true,
            get: (val) => getFormattedCode('OS', val),
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        priority: {
            type: Number,
            trim: true
        },
        image: {
            type: String,
            required: [true, 'Image is required'],
            trim: true,
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

onboardingScreenSchema.methods.softDelete = async function (userId) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

// Unique name only among non-deleted documents
onboardingScreenSchema.index({ title: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
// Removed mongoose-unique-validator to avoid false positives with soft delete
onboardingScreenSchema.plugin(AutoIncrement, {
    inc_field: 'code',
    id: 'onboardingScreen',
});

const OnboardingScreen = model('OnboardingScreen', onboardingScreenSchema);
export default OnboardingScreen;


