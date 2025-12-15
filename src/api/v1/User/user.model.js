
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    //common
    name: {
      type: String, trim: true
    },
    email: { type: String, unique: true, trim: true },
    mobile: { type: String, unique: true, trim: true, sparse: true },
    password: { type: String, trim: true },
    lastLogin: { date: String, ip: String },
    userRole: { type: mongoose.Types.ObjectId, ref: 'Role' },
    gender: { type: String, trim: true },
    token: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    activeSessionId: { type: String, default: '' },
    deleted: { type: Boolean, default: false },
    picture: { type: String, trim: true },
    loginMethod: { type: String, enum: ['mobile', 'web'], trim: true },
    passwordHistory: { type: [String], default: [] },
    //mobile
    googleId: { type: String, default: '' },
    isMpinSet: { type: Boolean, default: false },
    mobileVerified: { type: Boolean, default: false },
    //web user
    emailVerified: { type: Boolean, default: false },
    verificationToken: { type: String, trim: true },
    verificationTokenExpires: { type: String, trim: true },
  },
  {
    toJSON: { getters: true },
    timestamps: true,
  }
);

const User = model('User', userSchema);

export default User;
