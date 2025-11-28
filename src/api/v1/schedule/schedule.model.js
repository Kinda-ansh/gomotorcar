import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
import dayjs from '../../../utils/dayjs';

const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const WEEK_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

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

        // Configuration for generation
        internalCleaningCount: { type: Number, default: 0 },
        externalCleaningCount: { type: Number, default: 0 },
        packageDays: { type: Number, default: 0 },
        weekOffs: { type: [String], default: [] },

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

const allocateECEvents = (workingDatesLength, icDays, ecCount) => {
    const ecDays = new Set();
    const availableForEC = [];
    const daysAfterIC = [];

    for (let i = 0; i < workingDatesLength; i++) {
        const isIC = icDays.has(i);
        const isAfterIC = i > 0 && icDays.has(i - 1);

        if (!isIC) {
            if (isAfterIC) {
                daysAfterIC.push(i);
            } else {
                availableForEC.push(i);
            }
        }
    }

    if (availableForEC.length === 0 && daysAfterIC.length === 0) return ecDays;

    // Round 1
    let startIdx = 0;
    let endIdx = availableForEC.length - 1;
    let fromStart = true;

    while (ecDays.size < ecCount && startIdx <= endIdx) {
        if (fromStart) {
            ecDays.add(availableForEC[startIdx]);
            startIdx += 2;
        } else {
            ecDays.add(availableForEC[endIdx]);
            endIdx -= 2;
        }
        fromStart = !fromStart;
    }

    // Round 2
    if (ecDays.size < ecCount) {
        const remainingDays = availableForEC.filter(d => !ecDays.has(d));
        startIdx = 0;
        endIdx = remainingDays.length - 1;
        fromStart = true;

        while (ecDays.size < ecCount && startIdx <= endIdx) {
            if (fromStart) {
                ecDays.add(remainingDays[startIdx]);
                startIdx++;
            } else {
                ecDays.add(remainingDays[endIdx]);
                endIdx--;
            }
            fromStart = !fromStart;
        }
    }

    // Round 3
    if (ecDays.size < ecCount && daysAfterIC.length > 0) {
        for (const dayIndex of daysAfterIC) {
            if (ecDays.size >= ecCount) break;
            ecDays.add(dayIndex);
        }
    }

    return ecDays;
};

scheduleSchema.methods.generateScheduleDays = async function () {
    const events = [];

    const start = dayjs.utc(this.startDate);
    const allocationStart = start.add(1, 'day');

    const pkgDays = this.packageDays || 0;
    const icCount = this.internalCleaningCount || 0;
    const ecCount = this.externalCleaningCount || 0;
    const weekOffSet = new Set(this.weekOffs || []);

    // Holidays
    let holidaySet = new Set();
    let holidayNames = new Map();
    if (this.cityHoliday) {
        const CityHolidays = mongoose.model('CityHolidays');
        const cityHolidayDoc = await CityHolidays.findById(this.cityHoliday);
        if (cityHolidayDoc && cityHolidayDoc.holidays) {
            cityHolidayDoc.holidays.forEach(h => {
                const d = dayjs.utc(h.date).format('YYYY-MM-DD');
                holidaySet.add(d);
                holidayNames.set(d, h.holidayName);
            });
        }
    }

    const workingDates = []; // Array of dayjs objects
    let currentDate = allocationStart;

    // Initial Loop
    for (let i = 0; i < pkgDays; i++) {
        const dateStr = currentDate.format('YYYY-MM-DD');
        const dayName = WEEK_DAYS[currentDate.day()];

        if (weekOffSet.has(dayName)) {
            events.push({
                date: currentDate.toDate(),
                dayType: 'holiday',
                notes: 'Week Off'
            });
        } else if (holidaySet.has(dateStr)) {
            events.push({
                date: currentDate.toDate(),
                dayType: 'holiday',
                notes: `Holiday: ${holidayNames.get(dateStr) || ''}`
            });
        } else {
            workingDates.push(currentDate);
        }
        currentDate = currentDate.add(1, 'day');
    }

    // IC Allocation
    const icDays = new Set();
    if (workingDates.length > 0 && icCount > 0) {
        if (icCount === 1) {
            icDays.add(0);
        } else {
            const spacing = (workingDates.length - 1) / icCount;
            for (let i = 0; i < icCount; i++) {
                const dayIndex = Math.round(i * spacing);
                if (dayIndex < workingDates.length) {
                    icDays.add(dayIndex);
                }
            }
        }
    }

    // EC Allocation
    const ecDays = allocateECEvents(workingDates.length, icDays, ecCount);

    // Extension
    let extendedDays = 0;
    const extendedWorkingDates = [...workingDates];

    while (ecDays.size < ecCount) {
        const dateStr = currentDate.format('YYYY-MM-DD');
        const dayName = WEEK_DAYS[currentDate.day()];

        if (weekOffSet.has(dayName)) {
            events.push({
                date: currentDate.toDate(),
                dayType: 'holiday',
                notes: 'Week Off'
            });
        } else if (holidaySet.has(dateStr)) {
            events.push({
                date: currentDate.toDate(),
                dayType: 'holiday',
                notes: `Holiday: ${holidayNames.get(dateStr) || ''}`
            });
        } else {
            const currentIndex = extendedWorkingDates.length;
            const isAfterIC = currentIndex > 0 && icDays.has(currentIndex - 1);

            extendedWorkingDates.push(currentDate);

            if (!isAfterIC && !icDays.has(currentIndex)) {
                ecDays.add(currentIndex);
            }
        }
        currentDate = currentDate.add(1, 'day');
        extendedDays++;
        if (extendedDays > 365) break;
    }

    // Add IC/EC events
    extendedWorkingDates.forEach((date, index) => {
        if (icDays.has(index)) {
            events.push({
                date: date.toDate(),
                dayType: 'internalCleaningDay',
                notes: 'Internal Cleaning'
            });
        } else if (ecDays.has(index)) {
            events.push({
                date: date.toDate(),
                dayType: 'externalCleaningDay',
                notes: 'External Cleaning'
            });
        }
    });

    // Sort events by date
    events.sort((a, b) => a.date - b.date);

    this.scheduleDays = events;
    this.workingDays = extendedWorkingDates.length;
    this.endDate = currentDate.subtract(1, 'day').toDate();
};

scheduleSchema.pre('save', async function (next) {
    try {
        // Normalize dates
        if (this.startDate) this.startDate = normalizeDate(this.startDate);
        if (this.endDate) this.endDate = normalizeDate(this.endDate);

        // Normalize existing scheduleDays
        if (this.scheduleDays && this.scheduleDays.length > 0) {
            this.scheduleDays = this.scheduleDays.map(day => {
                const dayObj = day.toObject ? day.toObject() : day;
                return {
                    ...dayObj,
                    date: normalizeDate(day.date)
                };
            });
        }

        // Generate if empty
        if (!this.scheduleDays || this.scheduleDays.length === 0) {
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