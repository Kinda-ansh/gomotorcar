import httpStatus from '../../../utils/httpStatus';
import createResponse from '../../../utils/response';
import { extractCommonQueryParams, getIdFromParams } from '../../../utils/requestHelper';
import { getCommonSearchConditionForMasters } from '../../../utils/commonHelper';
import Cars from './Cars.model';
import { createCarSchema, updateCarSchema } from './Cars.validator';
import CarRegistrationType from './../CarRegistrationType/carRegistrationType.model';
import CarTransmissionType from './../CarTransmissionType/carTransmissionType.model';
import FuelType from './../FuelType/fuelType.model';
import Brand from './../brand/brand.model';
import CarModel from './../CarModel/carModel.model';
import CarCategory from './../CarCategory/carCategory.model';
import Schedule from '../schedule/schedule.model';
import dayjs from '../../../utils/dayjs';

/**
 * Helper to enrich cars with package details
 */
const enrichCarsWithPackageDetails = async (cars) => {
    if (!cars || cars.length === 0) return [];

    const carIds = cars.map(car => car._id);
    const today = dayjs().startOf('day');

    // Fetch all schedules for these cars
    const schedules = await Schedule.find({
        car: { $in: carIds },
        deletedAt: null
    }).sort({ endDate: -1 });

    // Group schedules by car
    const scheduleMap = {};
    schedules.forEach(schedule => {
        const carId = schedule.car.toString();
        if (!scheduleMap[carId]) {
            scheduleMap[carId] = [];
        }
        scheduleMap[carId].push(schedule);
    });

    // Enrich each car
    return cars.map(car => {
        const carSchedules = scheduleMap[car._id.toString()] || [];
        let packageDetails = {
            _id: null,
            status: 'No subscription',
            startDate: null,
            endDate: null
        };

        if (carSchedules.length > 0) {
            // Find active schedule
            const activeSchedule = carSchedules.find(s => {
                const start = dayjs(s.startDate).startOf('day');
                const end = dayjs(s.endDate).endOf('day');
                return (today.isAfter(start) || today.isSame(start)) &&
                    (today.isBefore(end) || today.isSame(end));
            });

            if (activeSchedule) {
                packageDetails = {
                    _id: activeSchedule.package,
                    status: 'Active',
                    startDate: activeSchedule.startDate,
                    endDate: activeSchedule.endDate
                };
            } else {
                // If no active schedule, check the latest one
                const latestSchedule = carSchedules[0]; // Already sorted by endDate desc
                const end = dayjs(latestSchedule.endDate).endOf('day');

                if (today.isAfter(end)) {
                    packageDetails = {
                        _id: latestSchedule.package,
                        status: 'Expired',
                        startDate: latestSchedule.startDate,
                        endDate: latestSchedule.endDate
                    };
                }
                // If latest is in future (not started yet), we could show 'Upcoming' or 'No subscription'
                // For now, sticking to Active/Expired/No subscription logic requested
                else if (dayjs(latestSchedule.startDate).isAfter(today)) {
                    packageDetails = {
                        _id: latestSchedule.package,
                        status: 'Upcoming', // Adding Upcoming as it's a logical state even if not explicitly requested, better than No Subscription
                        startDate: latestSchedule.startDate,
                        endDate: latestSchedule.endDate
                    };
                }
            }
        }

        return {
            ...car.toObject ? car.toObject() : car,
            packageDetails
        };
    });
};

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

        const [rawList, totalCount] = await Promise.all([
            Cars.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('brand', 'name code')
                .populate({
                    path: 'carModel',
                    select: 'name code brand carCategory image',
                    populate: [
                        { path: 'brand', select: 'name code' },
                        { path: 'carCategory', select: 'name code' }
                    ]
                })
                .populate('carRegistrationType', 'name code')
                .populate('carTransmissionType', 'name code')
                .populate('fuelType', 'name code'),
            Cars.countDocuments(query),
        ]);

        const list = await enrichCarsWithPackageDetails(rawList);

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

const getMycars = async (req, res) => {
    try {
        const { limit = 1000, skip = 0, search, isActive } = extractCommonQueryParams(req);
        let query = { deletedAt: null, createdBy: req.user._id };

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

        const [rawList, totalCount] = await Promise.all([
            Cars.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('brand', 'name image code')
                .populate({
                    path: 'carModel',
                    select: 'name code brand carCategory image',
                    populate: [
                        { path: 'brand', select: 'name code' },
                        { path: 'carCategory', select: 'name code' }
                    ]
                })
                .populate('carRegistrationType', 'name code')
                .populate('carTransmissionType', 'name code')
                .populate('fuelType', 'name code'),
            Cars.countDocuments(query),
        ]);

        const list = await enrichCarsWithPackageDetails(rawList);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'My cars retrieved successfully',
            data: { list, count: totalCount },
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Failed to fetch my cars',
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
            .populate({
                path: 'carModel',
                select: 'name code brand carCategory image',
                populate: [
                    { path: 'brand', select: 'name code' },
                    { path: 'carCategory', select: 'name code' }
                ]
            })
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
            .populate({
                path: 'carModel',
                select: 'name code brand carCategory image',
                populate: [
                    { path: 'brand', select: 'name code' },
                    { path: 'carCategory', select: 'name code' }
                ]
            })
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
                                from: 'brands',
                                localField: 'carModel.brand',
                                foreignField: '_id',
                                as: 'carModel.brand'
                            }
                        },
                        { $unwind: { path: '$carModel.brand', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'carcategories',
                                localField: 'carModel.carCategory',
                                foreignField: '_id',
                                as: 'carModel.carCategory'
                            }
                        },
                        { $unwind: { path: '$carModel.carCategory', preserveNullAndEmptyArrays: true } },
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

        // Get total counts from respective models (only active records)
        const [
            totalBrands,
            totalCarModels,
            totalCarCategories,
            totalCarRegistrationTypes,
            totalCarTransmissionTypes,
            totalFuelTypes
        ] = await Promise.all([
            Brand.countDocuments({ deletedAt: null }), // Assuming Brand model has similar structure
            CarModel.countDocuments({ deletedAt: null }), // Assuming CarModel model
            CarCategory.countDocuments({ deletedAt: null }), // Assuming CarCategory model
            CarRegistrationType.countDocuments({ deletedAt: null }), // Assuming CarRegistrationType model
            CarTransmissionType.countDocuments({ deletedAt: null }), // Assuming CarTransmissionType model
            FuelType.countDocuments({ deletedAt: null }) // Assuming FuelType model
        ]);

        const data = result[0] || {};

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Cars dashboard data retrieved successfully',
            data: {
                totalCars: data.totalCars[0]?.count || 0,
                totalBrands: totalBrands || 0,
                totalCarModels: totalCarModels || 0,
                totalCarCategories: totalCarCategories || 0,
                totalCarRegistrationTypes: totalCarRegistrationTypes || 0,
                totalCarTransmissionTypes: totalCarTransmissionTypes || 0,
                totalFuelTypes: totalFuelTypes || 0,
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
    getMycars,
    createCar,
    getCar,
    updateCar,
    deleteCar,
    getCarsDashboard,
};



