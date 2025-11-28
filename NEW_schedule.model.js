import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
import dayjs from '../../../utils/dayjs';

const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const scheduleDaySchema = new Schema(
    {
        date: {
            type: Date,
            required: true,
        },
        dayType: {
            type: String,
            enum: ['internalCleaningDay', 'externalCleaningDay', 'holiday'],
            default: 'internalCleaningDay',
        },
        isCompleted: {
            type: Boolean,
            default: false,
        },
        notes: {
            type: String,
            default: null,
        },
    },
    { _id: true }
);

const scheduleSchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
            trim: true,
            get: (val) => getFormattedCode('SCHE', val),
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        workingDays: {
            type: Number,
            default: 0,
        },
        scheduleDays: [scheduleDaySchema],
        cityHoliday: {
            type: Schema.Types.ObjectId,
            ref: 'CityHolidays',
            default: null,
        },
        car: {
            type: Schema.Types.ObjectId,
            ref: 'Cars',
            required: true,
        },
        package: {
            type: Schema.Types.ObjectId,
            ref: 'Package',
            default: null,
        },
        customer: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
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
        isActive: {
            type: Boolean,
            default: true,
        },
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

/**
 * Normalize date to UTC midnight with explicit format
 */
const normalizeDate = (date) => {
    if (typeof date === 'string') {
        const dateStr = date.split('T')[0];
        return dayjs.utc(dateStr, 'YYYY-MM-DD').startOf('day').toDate();
    }
    return dayjs.utc(date).startOf('day').toDate();
};

// Pre-save hook to normalize dates ONLY (frontend handles schedule generation)
scheduleSchema.pre('save', async function (next) {
    try {
        // Normalize startDate
        if (this.startDate) {
            this.startDate = normalizeDate(this.startDate);
        }

        // Normalize endDate
        if (this.endDate) {
            this.endDate = normalizeDate(this.endDate);
        }

        // Normalize scheduleDays dates if they exist
        if (this.scheduleDays && this.scheduleDays.length > 0) {
            this.scheduleDays = this.scheduleDays.map(day => {
                const normalizedDate = normalizeDate(day.date);
                const dayObj = day.toObject ? day.toObject() : day;
                return {
                    ...dayObj,
                    date: normalizedDate
                };
            });
        }

        next();
    } catch (error) {
        next(error);
    }
});

scheduleSchema.methods.softDelete = async function (userId) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

scheduleSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
scheduleSchema.plugin(uniqueValidator, { message: '{PATH} should be unique.' });
scheduleSchema.plugin(AutoIncrement, {
    inc_field: 'code',
    id: 'schedule',
});

const Schedule = model('Schedule', scheduleSchema);
export default Schedule;
