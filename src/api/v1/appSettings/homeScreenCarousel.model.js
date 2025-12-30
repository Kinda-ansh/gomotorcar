
import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const homeScreenCarouselSchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
            trim: true,
            get: (val) => getFormattedCode('HSC', val),
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
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
        navigationRoute: {
            type: String,
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

homeScreenCarouselSchema.methods.softDelete = async function (userId) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

// Unique name only among non-deleted documents
homeScreenCarouselSchema.index({ title: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
// Removed mongoose-unique-validator to avoid false positives with soft delete
homeScreenCarouselSchema.plugin(AutoIncrement, {
    inc_field: 'code',
    id: 'homeScreenCarousel',
});

const HomeScreenCarousel = model('HomeScreenCarousel', homeScreenCarouselSchema);
export default HomeScreenCarousel;


