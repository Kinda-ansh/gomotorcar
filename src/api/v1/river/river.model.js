import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const riverSchema = new Schema(
  {
    code: {
      type: Number,
      unique: true,
      trim: true,
      get: (val) => getFormattedCode('RV', val),
    },
    name: {
      english: {
        type: String,
        required: [true, 'English name is required'],
        trim: true,
      },
      hindi: {
        type: String,
        trim: true,
        index: {
          partialFilterExpression: { hindi: { $type: 'string' } },
        },
        default: null,
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
riverSchema.methods.softDelete = async function (userId) {
  this.deletedAt = new Date();
  this.deletedBy = userId;
  await this.save();
};
riverSchema.plugin(uniqueValidator, { message: '{PATH} should be unique.' });
riverSchema.plugin(AutoIncrement, {
  inc_field: 'code',
  id: 'river',
});

const River = model('River', riverSchema);
export default River;
