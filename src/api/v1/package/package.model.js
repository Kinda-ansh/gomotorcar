import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { getFormattedCode } from '../../../utils/commonHelper';
const { Schema, model } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

// Helper function to generate categoryPackageId
const generateCategoryPackageId = (packageCode, carCategoryCode) => {
    return `${packageCode}-${carCategoryCode}`;
};

// Sub-schema for Cleaner Payment Rate (nested inside category)
const cleanerPaymentRateSchema = new Schema({
    internalCleaning: {
        type: Number,
        required: [true, 'Internal cleaning payment rate is required'],
        min: [0, 'Internal cleaning payment rate cannot be negative']
    },
    externalCleaning: {
        type: Number,
        required: [true, 'External cleaning payment rate is required'],
        min: [0, 'External cleaning payment rate cannot be negative']
    }
}, { _id: false });

// Sub-schema for Customer Refund Rate (nested inside category)
const customerRefundRateSchema = new Schema({
    internalCleaning: {
        type: Number,
        required: [true, 'Internal cleaning refund rate is required'],
        min: [0, 'Internal cleaning refund rate cannot be negative']
    },
    externalCleaning: {
        type: Number,
        required: [true, 'External cleaning refund rate is required'],
        min: [0, 'External cleaning refund rate cannot be negative']
    }
}, { _id: false });

// Sub-schema for Category Pricing (contains all pricing details per category)
const categoryPricingSchema = new Schema({
    categoryPackageId: {
        type: String,
        trim: true,
        // This will be generated automatically: PKG0004-CC0001
    },
    carCategory: {
        type: Schema.Types.ObjectId,
        ref: 'CarCategory',
        required: [true, 'Car category is required']
    },
    strikeOffPrice: {
        type: Number,
        required: [true, 'Strike off price is required'],
        min: [0, 'Strike off price cannot be negative']
    },
    actualPrice: {
        type: Number,
        required: [true, 'Actual price is required'],
        min: [0, 'Actual price cannot be negative'],
        validate: {
            validator: function (value) {
                return value <= this.strikeOffPrice;
            },
            message: 'Actual price cannot exceed strike off price'
        }
    },
    taxAmount: {
        type: Number,
        default: 0,
        min: [0, 'Tax amount cannot be negative']
    },
    totalAmount: {
        type: Number,
        default: 0,
        min: [0, 'Total amount cannot be negative']
    },
    cleanerPaymentRate: {
        type: cleanerPaymentRateSchema,
        required: [true, 'Cleaner payment rate is required']
    },
    customerRefundRate: {
        type: customerRefundRateSchema,
        required: [true, 'Customer refund rate is required']
    }
}, { _id: false });

// Sub-schema for Tax Details
const taxDetailsSchema = new Schema({
    taxApplicable: {
        type: Boolean,
        default: false
    },
    taxName: {
        type: String,
        trim: true,
        default: null,
        required: function () {
            return this.taxApplicable === true;
        }
    },
    taxRate: {
        type: Number,
        min: [0, 'Tax rate cannot be negative'],
        max: [100, 'Tax rate cannot exceed 100%'],
        default: 0,
        required: function () {
            return this.taxApplicable === true;
        }
    }
}, { _id: false });

const approvalStatusSchema = new Schema({
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    rejection_reason: {
        type: String,
        required: function () {
            return this.status === 'rejected';
        }
    }
}, { _id: false });

// Main Package Schema
const packageSchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
            trim: true,
            get: (val) => getFormattedCode('PKG', val),
        },
        name: {
            type: String,
            required: [true, 'Package name is required'],
            trim: true
        },
        internalName: {
            type: String,
            required: [true, 'Internal name is required'],
            trim: true
        },
        cluster: {
            type: Schema.Types.ObjectId,
            ref: 'Cluster',
            default: null
        },
        categoryPricing: {
            type: [categoryPricingSchema],
            required: [true, 'At least one category pricing is required'],
            validate: {
                validator: function (value) {
                    return value && value.length > 0;
                },
                message: 'At least one category pricing is required'
            }
        },
        packageStatus: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
            lowercase: true
        },
        noOfDays: {
            type: Number,
            required: [true, 'Number of days is required'],
            min: [1, 'Number of days must be at least 1']
        },
        internalCleaning: {
            type: Number,
            required: [true, 'Internal cleaning is required'],
            min: [0, 'Internal cleaning cannot be negative']
        },
        externalCleaning: {
            type: Number,
            required: [true, 'External cleaning is required'],
            min: [0, 'External cleaning cannot be negative']
        },
        usageStatus: {
            type: String,
            enum: ['available', 'unavailable',],
            default: 'available',
            lowercase: true
        },
        taxDetails: {
            type: taxDetailsSchema,
            default: () => ({ taxApplicable: false, taxRate: 0 })
        },
        description: {
            type: String,
            trim: true,
            default: null
        },
        features: [{
            type: String,
            trim: true
        }],
        approval_status: {
            type: approvalStatusSchema,
            default: () => ({ status: 'pending' })
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

// Pre-save middleware to calculate tax amount and total amount for each category
packageSchema.pre('save', function (next) {
    if (this.categoryPricing && this.categoryPricing.length > 0) {
        this.categoryPricing.forEach(category => {
            if (this.taxDetails.taxApplicable && this.taxDetails.taxRate > 0) {
                category.taxAmount = (category.actualPrice * this.taxDetails.taxRate) / 100;
            } else {
                category.taxAmount = 0;
            }
            category.totalAmount = category.actualPrice + category.taxAmount;
        });
    }
    next();
});

// Post-save middleware to generate categoryPackageId after code is set by auto-increment
packageSchema.post('save', async function (doc, next) {
    try {
        // Only generate categoryPackageId for new documents or if missing
        if (doc.categoryPricing && doc.categoryPricing.length > 0) {
            // Access the raw numeric code value (not the formatted getter)
            const rawCode = doc.get('code', null, { getters: false });

            if (rawCode !== null && rawCode !== undefined) {
                let needsUpdate = false;

                // Get the package code (formatted from raw numeric value)
                const packageCode = getFormattedCode('PKG', rawCode);

                // Only proceed if we have a valid package code
                if (packageCode) {
                    // Process each category pricing
                    for (let category of doc.categoryPricing) {
                        // Generate categoryPackageId if not already set
                        if (!category.categoryPackageId && category.carCategory) {
                            const CarCategory = mongoose.model('CarCategory');
                            const carCategoryDoc = await CarCategory.findById(category.carCategory);
                            if (carCategoryDoc) {
                                // Access raw numeric code for car category too
                                const rawCategoryCode = carCategoryDoc.get('code', null, { getters: false });
                                if (rawCategoryCode !== null && rawCategoryCode !== undefined) {
                                    const carCategoryCode = getFormattedCode('CC', rawCategoryCode);
                                    if (carCategoryCode) {
                                        category.categoryPackageId = generateCategoryPackageId(packageCode, carCategoryCode);
                                        needsUpdate = true;
                                    }
                                }
                            }
                        }
                    }

                    // Update the document if we added categoryPackageId
                    if (needsUpdate) {
                        await Package.findByIdAndUpdate(doc._id, { categoryPricing: doc.categoryPricing });
                    }
                }
            }
        }
        next();
    } catch (error) {
        next(error);
    }
});

// Pre-findOneAndUpdate middleware to calculate tax and total on update and generate categoryPackageId
packageSchema.pre('findOneAndUpdate', async function (next) {
    try {
        const update = this.getUpdate();
        const setData = update.$set || update;

        // Handle categoryPricing updates
        if (setData.categoryPricing) {
            // Get the current document to access package code and tax details
            const docToUpdate = await this.model.findOne(this.getQuery());
            if (docToUpdate) {
                // Access the raw numeric code value (not the formatted getter)
                const rawCode = docToUpdate.get('code', null, { getters: false });

                if (rawCode !== null && rawCode !== undefined) {
                    const packageCode = getFormattedCode('PKG', rawCode);

                    // Only proceed if we have a valid package code
                    if (packageCode) {
                        const taxApplicable = setData['taxDetails.taxApplicable'] !== undefined
                            ? setData['taxDetails.taxApplicable']
                            : (setData.taxDetails && setData.taxDetails.taxApplicable !== undefined)
                                ? setData.taxDetails.taxApplicable
                                : docToUpdate.taxDetails.taxApplicable;

                        const taxRate = setData['taxDetails.taxRate'] !== undefined
                            ? setData['taxDetails.taxRate']
                            : (setData.taxDetails && setData.taxDetails.taxRate !== undefined)
                                ? setData.taxDetails.taxRate
                                : docToUpdate.taxDetails.taxRate;

                        // Process each category pricing
                        for (let category of setData.categoryPricing) {
                            // Calculate tax and total amounts
                            if (taxApplicable && taxRate > 0) {
                                category.taxAmount = (category.actualPrice * taxRate) / 100;
                            } else {
                                category.taxAmount = 0;
                            }
                            category.totalAmount = category.actualPrice + category.taxAmount;

                            // Generate categoryPackageId if not already set
                            if (!category.categoryPackageId && category.carCategory) {
                                const CarCategory = mongoose.model('CarCategory');
                                const carCategoryDoc = await CarCategory.findById(category.carCategory);
                                if (carCategoryDoc) {
                                    // Access raw numeric code for car category too
                                    const rawCategoryCode = carCategoryDoc.get('code', null, { getters: false });
                                    if (rawCategoryCode !== null && rawCategoryCode !== undefined) {
                                        const carCategoryCode = getFormattedCode('CC', rawCategoryCode);
                                        if (carCategoryCode) {
                                            category.categoryPackageId = generateCategoryPackageId(packageCode, carCategoryCode);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Handle tax details updates - need to recalculate all category pricing
        if (setData['taxDetails.taxApplicable'] !== undefined ||
            setData['taxDetails.taxRate'] !== undefined ||
            (setData.taxDetails && (setData.taxDetails.taxApplicable !== undefined || setData.taxDetails.taxRate !== undefined))) {

            // Fetch the current document to update all categories
            const docToUpdate = await this.model.findOne(this.getQuery());
            if (docToUpdate && docToUpdate.categoryPricing) {
                // Access the raw numeric code value (not the formatted getter)
                const rawCode = docToUpdate.get('code', null, { getters: false });

                if (rawCode !== null && rawCode !== undefined) {
                    const packageCode = getFormattedCode('PKG', rawCode);

                    // Only proceed if we have a valid package code
                    if (packageCode) {
                        const taxApplicable = setData['taxDetails.taxApplicable'] !== undefined
                            ? setData['taxDetails.taxApplicable']
                            : (setData.taxDetails && setData.taxDetails.taxApplicable !== undefined)
                                ? setData.taxDetails.taxApplicable
                                : docToUpdate.taxDetails.taxApplicable;

                        const taxRate = setData['taxDetails.taxRate'] !== undefined
                            ? setData['taxDetails.taxRate']
                            : (setData.taxDetails && setData.taxDetails.taxRate !== undefined)
                                ? setData.taxDetails.taxRate
                                : docToUpdate.taxDetails.taxRate;

                        // Update all categories with new tax calculation and ensure categoryPackageId
                        const updatedCategoryPricing = [];
                        for (let category of docToUpdate.categoryPricing) {
                            const categoryObj = category.toObject ? category.toObject() : category;

                            // Calculate tax and total amounts
                            if (taxApplicable && taxRate > 0) {
                                categoryObj.taxAmount = (categoryObj.actualPrice * taxRate) / 100;
                            } else {
                                categoryObj.taxAmount = 0;
                            }
                            categoryObj.totalAmount = categoryObj.actualPrice + categoryObj.taxAmount;

                            // Ensure categoryPackageId exists
                            if (!categoryObj.categoryPackageId && categoryObj.carCategory) {
                                const CarCategory = mongoose.model('CarCategory');
                                const carCategoryDoc = await CarCategory.findById(categoryObj.carCategory);
                                if (carCategoryDoc) {
                                    // Access raw numeric code for car category too
                                    const rawCategoryCode = carCategoryDoc.get('code', null, { getters: false });
                                    if (rawCategoryCode !== null && rawCategoryCode !== undefined) {
                                        const carCategoryCode = getFormattedCode('CC', rawCategoryCode);
                                        if (carCategoryCode) {
                                            categoryObj.categoryPackageId = generateCategoryPackageId(packageCode, carCategoryCode);
                                        }
                                    }
                                }
                            }

                            updatedCategoryPricing.push(categoryObj);
                        }

                        setData.categoryPricing = updatedCategoryPricing;
                    }
                }
            }
        }

        next();
    } catch (error) {
        next(error);
    }
});

// Soft delete method
packageSchema.methods.softDelete = async function (userId) {
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

// Indexes for better query performance
packageSchema.index({ name: 1 });
packageSchema.index({ cluster: 1 });
packageSchema.index({ 'categoryPricing.carCategory': 1 });
packageSchema.index({ packageStatus: 1 });
packageSchema.index({ deletedAt: 1 });
packageSchema.index({ createdAt: -1 });

// Compound index for common queries
packageSchema.index({ cluster: 1, packageStatus: 1, deletedAt: 1 });

// Auto-increment plugin
packageSchema.plugin(AutoIncrement, {
    inc_field: 'code',
    id: 'package',
});

const Package = model('Package', packageSchema);
export default Package;

