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

export const CarsController = {
    getCars,
    createCar,
    getCar,
    updateCar,
    deleteCar,
};



