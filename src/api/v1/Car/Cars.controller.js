import httpStatus from '../../../utils/httpStatus';
import createResponse from '../../../utils/response';
import { extractCommonQueryParams, getIdFromParams } from '../../../utils/requestHelper';
import { getCommonSearchConditionForMasters } from '../../../utils/commonHelper';
import Cars from './Cars.model';
import { createCarSchema, updateCarSchema } from './Cars.validator';

const getCars = async (req, res) => {
    try {
        const { limit = 1000, skip = 0, search, isActive } = extractCommonQueryParams(req);
        let query = { deletedAt: null };
        if (req.query.showActiveOnly == 'true') {
            query.isActive = true;
        }

        if (search) {
            query.$or = getCommonSearchConditionForMasters(search, ['name', 'registrationNumber']);
        }

        if (isActive === 'true' || isActive === true) {
            query.isActive = true;
        } else if (isActive === 'false' || isActive === false) {
            query.isActive = false;
        }

        const [list, totalCount] = await Promise.all([
            Cars.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('brand', 'name code')
                .populate('carModel', 'name code')
                .populate('carCategory', 'name code')
                .populate('carRegistrationType', 'name code')
                .populate('carTransmissionType', 'name code')
                .populate('fuelType', 'name code'),
            Cars.countDocuments(query),
        ]);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Cars retrieved',
            data: { list, count: totalCount },
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Failed to fetch cars',
            status: false,
            error: error.message,
        });
    }
};

const createCar = async (req, res) => {
    try {
        req.body.createdBy = req.user._id;
        req.body.updatedBy = req.user._id;

        const data = await createCarSchema.validate(req.body, {
            abortEarly: false,
        });

        const record = await Cars.create(data);

        return createResponse({
            res,
            statusCode: httpStatus.CREATED,
            status: true,
            message: 'Car created successfully.',
            data: record,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message: error.code === 11000 ? 'Car with this registration number or code already exists.' : error.message,
            error: error.message,
        });
    }
};

const getCar = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const record = await Cars.findOne({ _id: id, deletedAt: null })
            .populate('brand', 'name code')
            .populate('carModel', 'name code')
            .populate('carCategory', 'name code')
            .populate('carRegistrationType', 'name code')
            .populate('carTransmissionType', 'name code')
            .populate('fuelType', 'name code');

        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Car not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Car fetched successfully',
            data: record,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch car',
            error: error.message,
        });
    }
};

const updateCar = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        req.body.updatedBy = req.user._id;

        const data = await updateCarSchema.validate(req.body, {
            abortEarly: false,
        });

        const record = await Cars.findOneAndUpdate(
            { _id: id, deletedAt: null },
            { $set: data },
            { new: true }
        )
            .populate('brand', 'name code')
            .populate('carModel', 'name code')
            .populate('carCategory', 'name code')
            .populate('carRegistrationType', 'name code')
            .populate('carTransmissionType', 'name code')
            .populate('fuelType', 'name code');

        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Car not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Car updated successfully.',
            data: record,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message: error.code === 11000 ? 'Duplicate field value exists.' : 'Failed to update car.',
            error: error.message,
        });
    }
};

const deleteCar = async (req, res) => {
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

        const record = await Cars.findOne({ _id: id, deletedAt: null });
        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'Car not found',
            });
        }
        await record.softDelete(req.user._id);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Car deleted successfully',
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to delete car',
            error: error.message,
        });
    }
};


const getCarsDashboard = async (req, res) => {
    try {
        const query = { deletedAt: null };

        // Aggregation pipeline
        const aggregation = [
            { $match: query },
            {
                $facet: {
                    totalCars: [{ $count: 'count' }],
                    totalBrands: [{ $group: { _id: '$brand' } }, { $count: 'count' }],
                    totalCarModels: [{ $group: { _id: '$carModel' } }, { $count: 'count' }],
                    totalCarCategories: [{ $group: { _id: '$carCategory' } }, { $count: 'count' }],
                    totalCarRegistrationTypes: [{ $group: { _id: '$carRegistrationType' } }, { $count: 'count' }],
                    totalCarTransmissionTypes: [{ $group: { _id: '$carTransmissionType' } }, { $count: 'count' }],
                    totalFuelTypes: [{ $group: { _id: '$fuelType' } }, { $count: 'count' }],
                    latestCars: [
                        { $sort: { createdAt: -1 } },
                        { $limit: 10 },
                        {
                            $lookup: {
                                from: 'brands',
                                localField: 'brand',
                                foreignField: '_id',
                                as: 'brand'
                            }
                        },
                        { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'carmodels',
                                localField: 'carModel',
                                foreignField: '_id',
                                as: 'carModel'
                            }
                        },
                        { $unwind: { path: '$carModel', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'carcategories',
                                localField: 'carCategory',
                                foreignField: '_id',
                                as: 'carCategory'
                            }
                        },
                        { $unwind: { path: '$carCategory', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'carregistrationtypes',
                                localField: 'carRegistrationType',
                                foreignField: '_id',
                                as: 'carRegistrationType'
                            }
                        },
                        { $unwind: { path: '$carRegistrationType', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'cartransmissiontypes',
                                localField: 'carTransmissionType',
                                foreignField: '_id',
                                as: 'carTransmissionType'
                            }
                        },
                        { $unwind: { path: '$carTransmissionType', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'fueltypes',
                                localField: 'fuelType',
                                foreignField: '_id',
                                as: 'fuelType'
                            }
                        },
                        { $unwind: { path: '$fuelType', preserveNullAndEmptyArrays: true } }
                    ]
                }
            }
        ];

        const result = await Cars.aggregate(aggregation);

        const data = result[0] || {};

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Cars dashboard data retrieved successfully',
            data: {
                totalCars: data.totalCars[0]?.count || 0,
                totalBrands: data.totalBrands[0]?.count || 0,
                totalCarModels: data.totalCarModels[0]?.count || 0,
                totalCarCategories: data.totalCarCategories[0]?.count || 0,
                totalCarRegistrationTypes: data.totalCarRegistrationTypes[0]?.count || 0,
                totalCarTransmissionTypes: data.totalCarTransmissionTypes[0]?.count || 0,
                totalFuelTypes: data.totalFuelTypes[0]?.count || 0,
                latestCars: data.latestCars || []
            }
        });
    } catch (error) {
        console.error('Cars dashboard error:', error);
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch Cars dashboard',
            error: error.message
        });
    }
};
export const CarsController = {
    getCars,
    createCar,
    getCar,
    updateCar,
    deleteCar,
    getCarsDashboard,
};



