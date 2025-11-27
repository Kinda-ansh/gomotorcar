import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
import dayjs from '../../../utils/dayjs';
import { IST } from '../../../utils/dayjs'; // Import IST constant

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
 * Normalize date to UTC midnight (00:00:00)
 */
const normalizeDate = (date) => {
    // Parse the date in UTC and set to start of day (midnight)
    return dayjs.utc(date).startOf('day').toDate();
};

/**
 * Generate schedule days automatically (LEGACY - for backward compatibility)
 * This is only used if scheduleDays are not provided from the frontend
 */
scheduleSchema.methods.generateScheduleDays = async function () {
    const scheduleDays = [];

    // Use the dates directly (they're already normalized)
    const start = dayjs.utc(this.startDate);
    const end = dayjs.utc(this.endDate);

    // Validate date range - end date should be after start date
    // Since working days start from day after startDate, we need at least 1 day difference
    if (end.isSameOrBefore(start, 'day')) {
        throw new Error('End date must be after start date');
    }

    // Get holidays from cityHoliday model
    let holidays = [];
    if (this.cityHoliday) {
        const CityHolidays = mongoose.model('CityHolidays');
        const cityHolidayDoc = await CityHolidays.findById(this.cityHoliday);
        if (cityHolidayDoc && cityHolidayDoc.holidays) {
            holidays = cityHolidayDoc.holidays.map(h => {
                return dayjs.utc(h.date).format('YYYY-MM-DD');
            });
        }
    }

    // Start from next day of startDate (working days start from day after startDate)
    let currentDate = start.add(1, 'day');
    const endOfSchedule = end;

    // First cleaning day is always internal
    let isInternalCleaning = true;
    let workingDaysCount = 0;

    // Generate days from next day of start date to end date (inclusive)
    while (currentDate.isSameOrBefore(endOfSchedule, 'day')) {
        const dateString = currentDate.format('YYYY-MM-DD');

        // Check if current date is a holiday
        const isHoliday = holidays.includes(dateString);

        let dayType;
        if (isHoliday) {
            dayType = 'holiday';
            // Don't alternate cleaning day type on holidays
            // Don't increment working days count
        } else {
            // Alternate between internal and external cleaning days
            dayType = isInternalCleaning ? 'internalCleaningDay' : 'externalCleaningDay';
            isInternalCleaning = !isInternalCleaning; // Toggle for next working day
            workingDaysCount++;
        }

        scheduleDays.push({
            date: currentDate.toDate(),
            dayType: dayType,
            isCompleted: false,
            notes: null,
        });

        // Move to next day
        currentDate = currentDate.add(1, 'day');
    }

    this.scheduleDays = scheduleDays;
    this.workingDays = workingDaysCount;
};

// Pre-save hook to normalize dates and conditionally generate schedule days
scheduleSchema.pre('save', async function (next) {
    try {
        // Normalize dates before saving using dayjs
        if (this.startDate) {
            this.startDate = normalizeDate(this.startDate);
        }
        if (this.endDate) {
            this.endDate = normalizeDate(this.endDate);
        }

        // Normalize scheduleDays dates if they exist
        if (this.scheduleDays && this.scheduleDays.length > 0) {
            this.scheduleDays = this.scheduleDays.map(day => ({
                ...day,
                date: normalizeDate(day.date)
            }));
        }

        // Generate schedule days ONLY if:
        // 1. scheduleDays array is empty or undefined (not provided from frontend)
        // 2. AND it's a new document OR dates/cityHoliday have been modified
        const shouldGenerateScheduleDays = (!this.scheduleDays || this.scheduleDays.length === 0) &&
            (this.isNew || this.isModified('startDate') || this.isModified('endDate') || this.isModified('cityHoliday'));

        if (shouldGenerateScheduleDays) {
            // Auto-generate using the old logic (for backward compatibility)
            await this.generateScheduleDays();
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