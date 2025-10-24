import httpStatus from '../../../utils/httpStatus';
import createResponse from '../../../utils/response';
import { extractCommonQueryParams, getIdFromParams } from '../../../utils/requestHelper';
import { getCommonSearchConditionForMasters } from '../../../utils/commonHelper';
import Package from './package.model';
import { createPackageSchema, updatePackageSchema } from './package.validator';

/**
 * Get all packages with filters
 */
const getPackages = async (req, res) => {
    try {
        const { limit = 1000, skip = 0, search, isActive } = extractCommonQueryParams(req);
        const { approval_status } = req.query;

        let query = { deletedAt: null };

        // Filter by active status
        if (req.query.showActiveOnly == 'true') {
            query.isActive = true;
        }

        // Filter by package status
        if (req.query.packageStatus) {
            query.packageStatus = req.query.packageStatus.toLowerCase();
        }

        // Filter by usage status
        if (req.query.usageStatus) {
            query.usageStatus = req.query.usageStatus.toLowerCase();
        }

        // Filter by cluster
        if (req.query.cluster) {
            query.cluster = req.query.cluster;
        }

        // Filter by car category (search within categoryPricing array)
        if (req.query.carCategory) {
            query['categoryPricing.carCategory'] = req.query.carCategory;
        }

        // Filter by approval status if provided
        if (approval_status && ['pending', 'approved', 'rejected'].includes(approval_status)) {
            query['approval_status.status'] = approval_status;
        }

        // Search functionality
        if (search) {
            query.$or = [
                ...getCommonSearchConditionForMasters(search, ['name', 'internalName', 'description']),
            ];
        }

        // isActive filter
        if (isActive === 'true' || isActive === true) {
            query.isActive = true;
        } else if (isActive === 'false' || isActive === false) {
            query.isActive = false;
        }

        const [list, totalCount, approvedCount, pendingCount, rejectedCount] = await Promise.all([
            Package.find(query)
                .populate('cluster', 'code name')
                .populate('categoryPricing.carCategory', 'code name')
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Package.countDocuments(query),
            // Count approved packages
            Package.countDocuments({
                deletedAt: null,
                'approval_status.status': 'approved'
            }),
            // Count pending packages
            Package.countDocuments({
                deletedAt: null,
                'approval_status.status': 'pending'
            }),
            // Count rejected packages
            Package.countDocuments({
                deletedAt: null,
                'approval_status.status': 'rejected'
            })
        ]);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Packages retrieved successfully',
            data: {
                list,
                count: totalCount,
                statusCounts: {
                    approved: approvedCount,
                    pending: pendingCount,
                    rejected: rejectedCount,
                    total: approvedCount + pendingCount + rejectedCount
                }
            },
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Failed to fetch packages',
            status: false,
            error: error.message,
        });
    }
};

/**
 * Create a new package
 */
const createPackage = async (req, res) => {
    try {
        req.body.createdBy = req.user._id;
        req.body.updatedBy = req.user._id;

        const data = await createPackageSchema.validate(req.body, {
            abortEarly: false,
        });

        // If cluster is empty string or null, set to null
        if (!data.cluster) {
            data.cluster = null;
        }

        // Tax amount and total amount will be calculated automatically in pre-save hook
        const record = await Package.create(data);

        // Populate the created record
        await record.populate([
            { path: 'cluster', select: 'code name' },
            { path: 'categoryPricing.carCategory', select: 'code name' },
            { path: 'createdBy', select: 'name email' },
            { path: 'updatedBy', select: 'name email' }
        ]);

        return createResponse({
            res,
            statusCode: httpStatus.CREATED,
            status: true,
            message: 'Package created successfully.',
            data: record,
        });
    } catch (error) {
        console.error('Create package error:', error);
        return createResponse({
            res,
            statusCode: error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message: error.code === 11000
                ? 'Package with this name or code already exists.'
                : error.message,
            error: error.errors ? Object.values(error.errors).map(e => e.message).join(', ') : error.message,
        });
    }
};

/**
 * Get a single package by ID
 */
const getPackage = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const record = await Package.findOne({ _id: id, deletedAt: null })
            .populate('cluster', 'code name address')
            .populate('categoryPricing.carCategory', 'code name')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Package not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Package fetched successfully',
            data: record,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch package',
            error: error.message,
        });
    }
};

/**
 * Update a package by ID
 */
const updatePackage = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        req.body.updatedBy = req.user._id;

        const data = await updatePackageSchema.validate(req.body, {
            abortEarly: false,
        });

        // If cluster is empty string or null, set to null
        if (data.cluster === '' || data.cluster === null) {
            data.cluster = null;
        }

        const record = await Package.findOneAndUpdate(
            { _id: id, deletedAt: null },
            { $set: data },
            { new: true, runValidators: true }
        )
            .populate('cluster', 'code name')
            .populate('categoryPricing.carCategory', 'code name')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Package not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Package updated successfully.',
            data: record,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message: error.code === 11000
                ? 'Duplicate field value exists.'
                : 'Failed to update package.',
            error: error.message,
        });
    }
};

/**
 * Soft delete a package by ID
 */
const deletePackage = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        if (!id) {
            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                status: false,
                message: 'ID not provided',
            });
        }

        const record = await Package.findOne({ _id: id, deletedAt: null });
        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Package not found',
            });
        }

        await record.softDelete(req.user._id);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Package deleted successfully',
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to delete package',
            error: error.message,
        });
    }
};

/**
 * Get packages by cluster
 */
const getPackagesByCluster = async (req, res) => {
    try {
        const clusterId = req.params.clusterId;

        const packages = await Package.find({
            cluster: clusterId,
            deletedAt: null,
            isActive: true,
            packageStatus: 'active'
        })
            .populate('categoryPricing.carCategory', 'code name')
            .sort({ createdAt: -1 });

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Packages retrieved successfully',
            data: packages,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch packages by cluster',
            error: error.message,
        });
    }
};

/**
 * Get packages by car category
 */
const getPackagesByCarCategory = async (req, res) => {
    try {
        const carCategoryId = req.params.carCategoryId;

        const packages = await Package.find({
            'categoryPricing.carCategory': carCategoryId,
            deletedAt: null,
            isActive: true,
            packageStatus: 'active'
        })
            .populate('cluster', 'code name')
            .populate('categoryPricing.carCategory', 'code name')
            .sort({ createdAt: -1 });

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Packages retrieved successfully',
            data: packages,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch packages by car category',
            error: error.message,
        });
    }
};

/**
 * Approve a package
 */
const approvePackage = async (req, res) => {
    try {
        const id = getIdFromParams(req);

        const record = await Package.findOneAndUpdate(
            { _id: id, deletedAt: null },
            {
                $set: {
                    'approval_status.status': 'approved',
                    updatedBy: req.user._id
                },
                $unset: { 'approval_status.rejection_reason': '' }
            },
            { new: true, runValidators: true }
        )
            .populate('cluster', 'code name')
            .populate('categoryPricing.carCategory', 'code name')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Package not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Package approved successfully.',
            data: record,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to approve package',
            error: error.message,
        });
    }
};

/**
 * Reject a package
 */
const rejectPackage = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const { rejection_reason } = req.body;

        if (!rejection_reason || !rejection_reason.trim()) {
            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                status: false,
                message: 'Rejection reason is required',
            });
        }

        const record = await Package.findOneAndUpdate(
            { _id: id, deletedAt: null },
            {
                $set: {
                    'approval_status.status': 'rejected',
                    'approval_status.rejection_reason': rejection_reason.trim(),
                    updatedBy: req.user._id
                }
            },
            { new: true, runValidators: true }
        )
            .populate('cluster', 'code name')
            .populate('categoryPricing.carCategory', 'code name')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Package not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Package rejected successfully.',
            data: record,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to reject package',
            error: error.message,
        });
    }
};

/**
 * Get packages by approval status
 */
const getPackagesByApprovalStatus = async (req, res) => {
    try {
        const status = req.params.status;

        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                status: false,
                message: 'Invalid approval status. Must be: pending, approved, or rejected',
            });
        }

        const packages = await Package.find({
            'approval_status.status': status,
            deletedAt: null
        })
            .populate('cluster', 'code name')
            .populate('categoryPricing.carCategory', 'code name')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ createdAt: -1 });

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: `${status.charAt(0).toUpperCase() + status.slice(1)} packages retrieved successfully`,
            data: packages,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch packages by approval status',
            error: error.message,
        });
    }
};

/**
 * Get all category pricing entries as a flattened list
 * Each entry contains the main package data with individual category pricing details
 * 
 * @route GET /api/v1/packages/category-pricing/all
 * @description Returns a flattened list where each entry represents a single category pricing
 *              with complete package information. Useful for displaying category-package combinations
 *              in tables or lists where each row represents one category from a package.
 * 
 * @query {number} limit - Number of entries to return (default: 1000)
 * @query {number} skip - Number of entries to skip for pagination (default: 0)
 * @query {string} search - Search term for package name, internal name, or description
 * @query {boolean} isActive - Filter by active status
 * @query {boolean} showActiveOnly - Show only active packages
 * @query {string} approval_status - Filter by approval status (pending, approved, rejected)
 * @query {string} packageStatus - Filter by package status (active, inactive)
 * @query {string} usageStatus - Filter by usage status (available, unavailable, limited)
 * @query {string} cluster - Filter by cluster ID
 * @query {string} carCategory - Filter by car category ID
 * 
 * @returns {Object} Response containing:
 *   - list: Array of flattened category pricing entries
 *   - count: Total number of entries
 *   - statusCounts: Counts by approval status
 *   - summary: Additional statistics
 * 
 * @example Response structure:
 * {
 *   "list": [
 *     {
 *       "categoryPackageId": "PKG0001-CC0001",
 *       "carCategory": { "_id": "...", "code": "CC0001", "name": "Sedan" },
 *       "strikeOffPrice": 1000,
 *       "actualPrice": 800,
 *       "taxAmount": 144,
 *       "totalAmount": 944,
 *       "packageId": "...",
 *       "packageCode": "PKG0001",
 *       "packageName": "Basic Wash",
 *       "categoryName": "Sedan",
 *       "categoryCode": "CC0001",
 *       // ... all other package fields
 *     }
 *   ],
 *   "count": 150,
 *   "statusCounts": { "approved": 100, "pending": 30, "rejected": 20 },
 *   "summary": {
 *     "totalPackages": 50,
 *     "totalCategoryPricingEntries": 150,
 *     "averageCategoriesPerPackage": "3.00"
 *   }
 * }
 */
const getAllCategoryPricing = async (req, res) => {
    try {
        const { limit = 1000, skip = 0, search, isActive } = extractCommonQueryParams(req);
        const { approval_status, packageStatus, usageStatus, cluster, carCategory } = req.query;

        let query = { deletedAt: null };

        // Filter by active status
        if (req.query.showActiveOnly == 'true') {
            query.isActive = true;
        }

        // Filter by package status
        if (packageStatus) {
            query.packageStatus = packageStatus.toLowerCase();
        }

        // Filter by usage status
        if (usageStatus) {
            query.usageStatus = usageStatus.toLowerCase();
        }

        // Filter by cluster
        if (cluster) {
            query.cluster = cluster;
        }

        // Filter by car category (search within categoryPricing array)
        if (carCategory) {
            query['categoryPricing.carCategory'] = carCategory;
        }

        // Filter by approval status if provided
        if (approval_status && ['pending', 'approved', 'rejected'].includes(approval_status)) {
            query['approval_status.status'] = approval_status;
        }

        // Search functionality
        if (search) {
            query.$or = [
                ...getCommonSearchConditionForMasters(search, ['name', 'internalName', 'description']),
            ];
        }

        // isActive filter
        if (isActive === 'true' || isActive === true) {
            query.isActive = true;
        } else if (isActive === 'false' || isActive === false) {
            query.isActive = false;
        }

        // Get packages with populated data
        const packages = await Package.find(query)
            .populate('cluster', 'code name address')
            .populate('categoryPricing.carCategory', 'code name')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ createdAt: -1 });

        // Flatten the category pricing data
        const categoryPricingList = [];

        packages.forEach(pkg => {
            if (pkg.categoryPricing && pkg.categoryPricing.length > 0) {
                pkg.categoryPricing.forEach((categoryPricing, index) => {
                    // Create a flattened entry with package data and individual category pricing
                    const flattenedEntry = {
                        // Category-specific data
                        categoryPackageId: categoryPricing.categoryPackageId,
                        carCategory: categoryPricing.carCategory,
                        strikeOffPrice: categoryPricing.strikeOffPrice,
                        actualPrice: categoryPricing.actualPrice,
                        taxAmount: categoryPricing.taxAmount,
                        totalAmount: categoryPricing.totalAmount,
                        cleanerPaymentRate: categoryPricing.cleanerPaymentRate,
                        customerRefundRate: categoryPricing.customerRefundRate,
                        categoryIndex: index,

                        // Package data
                        packageId: pkg._id,
                        packageCode: pkg.code,
                        packageName: pkg.name,
                        internalName: pkg.internalName,
                        cluster: pkg.cluster,
                        packageStatus: pkg.packageStatus,
                        noOfDays: pkg.noOfDays,
                        usageStatus: pkg.usageStatus,
                        taxDetails: pkg.taxDetails,
                        description: pkg.description,
                        features: pkg.features,
                        approval_status: pkg.approval_status,
                        isActive: pkg.isActive,
                        createdAt: pkg.createdAt,
                        updatedAt: pkg.updatedAt,
                        createdBy: pkg.createdBy,
                        updatedBy: pkg.updatedBy,

                        // Additional computed fields
                        totalCategories: pkg.categoryPricing.length,
                        categoryName: typeof categoryPricing.carCategory === 'object'
                            ? categoryPricing.carCategory.name
                            : 'Unknown',
                        categoryCode: typeof categoryPricing.carCategory === 'object'
                            ? categoryPricing.carCategory.code
                            : null,
                    };

                    categoryPricingList.push(flattenedEntry);
                });
            }
        });

        // Apply pagination to the flattened list
        const paginatedList = categoryPricingList.slice(skip, skip + limit);
        const totalCount = categoryPricingList.length;

        // Get counts by approval status for the flattened entries
        const approvedCount = categoryPricingList.filter(entry =>
            entry.approval_status?.status === 'approved'
        ).length;

        const pendingCount = categoryPricingList.filter(entry =>
            entry.approval_status?.status === 'pending'
        ).length;

        const rejectedCount = categoryPricingList.filter(entry =>
            entry.approval_status?.status === 'rejected'
        ).length;

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Category pricing entries retrieved successfully',
            data: {
                list: paginatedList,
                count: totalCount,
                statusCounts: {
                    approved: approvedCount,
                    pending: pendingCount,
                    rejected: rejectedCount,
                    total: approvedCount + pendingCount + rejectedCount
                },
                summary: {
                    totalPackages: packages.length,
                    totalCategoryPricingEntries: totalCount,
                    averageCategoriesPerPackage: packages.length > 0
                        ? (totalCount / packages.length).toFixed(2)
                        : 0
                }
            },
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Failed to fetch category pricing entries',
            status: false,
            error: error.message,
        });
    }
};

export const PackageController = {
    getPackages,
    createPackage,
    getPackage,
    updatePackage,
    deletePackage,
    getPackagesByCluster,
    getPackagesByCarCategory,
    approvePackage,
    rejectPackage,
    getPackagesByApprovalStatus,
    getAllCategoryPricing,
};

