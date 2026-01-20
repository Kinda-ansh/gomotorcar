import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const roleSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  internalName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  permissions: [{
    module: {
      type: String,
      required: true,
      trim: true
    },
    actions: [{
      type: String,
      enum: ['create', 'view', 'edit', 'delete']
    }]
  }]
}, { timestamps: true });

// Index for faster queries
roleSchema.index({ name: 1 });
roleSchema.index({ internalName: 1 });

const Role = model('Role', roleSchema);

export default Role;