import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
import dayjs from '../../../utils/dayjs';

const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const cityHolidaysSchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
            trim: true,
            get: (val) => getFormattedCode('HD', val),
        },
        cityName: {
            type: String,
            required: [true, 'City name is required'],
            trim: true
        },
        holidays: [
            {
                holidayName: {
                    type: String,
                    required: [true, 'Holiday name is required'],
                    trim: true
                },
                date: {
                    type: Date,
                    required: [true, 'Holiday date is required']
                }
            }
        ],
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
            default: true 
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

cityHolidaysSchema.pre('save', function (next) {
    if (this.holidays && Array.isArray(this.holidays)) {
        this.holidays = this.holidays.map(holiday => {
            if (holiday.date) {
                // Normalize to UTC midnight
                const dateStr = holiday.date.toISOString().split('T')[0];
                holiday.date = dayjs.utc(dateStr).toDate();
            }
            return holiday;
        });
    }
    next();
});

cityHolidaysSchema.methods.softDelete = async function (userId) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

// Unique cityName only among non-deleted documents
cityHolidaysSchema.index(
    { cityName: 1 }, 
    { unique: true, partialFilterExpression: { deletedAt: null } }
);

cityHolidaysSchema.plugin(AutoIncrement, {
    inc_field: 'code',
    id: 'cityHolidays',
});

const CityHolidays = model('CityHolidays', cityHolidaysSchema);
export default CityHolidays;
