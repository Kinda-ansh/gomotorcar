import httpStatus from '../../../utils/httpStatus';
import createResponse from '../../../utils/response';
import { extractCommonQueryParams, getIdFromParams } from '../../../utils/requestHelper';
import { getCommonSearchConditionForMasters } from '../../../utils/commonHelper';
import QRCodeSeries from './qrcode-series.model';
import {
    createQRCodeSeriesSchema,
    updateQRCodeSeriesSchema
} from './qrcode-series.validator';

// Get all QR Code Series with pagination, search, and filters
const getQRCodeSeries = async (req, res) => {
    try {
        const { limit = 1000, skip = 0, search, isActive } = extractCommonQueryParams(req);
        let query = { deletedAt: null };

        if (req.query.showActiveOnly == 'true') {
            query.isActive = true;
        }

        if (search) {
            query.$or = getCommonSearchConditionForMasters(search, [
                'name',
                'prefix',
                'range',
                'generated_range'
            ]);
        }

        if (isActive === 'true' || isActive === true) {
            query.isActive = true;
        } else if (isActive === 'false' || isActive === false) {
            query.isActive = false;
        }

        const [list, totalCount] = await Promise.all([
            QRCodeSeries.find(query)
                .populate('cluster', 'name code address')
                .populate('qr_codes')
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            QRCodeSeries.countDocuments(query),
        ]);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'QR code series retrieved successfully',
            data: { list, count: totalCount },
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Failed to fetch QR code series',
            status: false,
            error: error.message,
        });
    }
};

// Create new QR Code Series
const createQRCodeSeries = async (req, res) => {
    try {
        req.body.createdBy = req.user._id;
        req.body.updatedBy = req.user._id;

        const data = await createQRCodeSeriesSchema.validate(req.body, {
            abortEarly: false,
        });

        const record = await QRCodeSeries.create(data);

        // Populate the created record for response
        const populatedRecord = await QRCodeSeries.findById(record._id)
            .populate('cluster', 'name code address')
            .populate('qr_codes')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        return createResponse({
            res,
            statusCode: httpStatus.CREATED,
            status: true,
            message: 'QR code series created successfully.',
            data: populatedRecord,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message: error.code === 11000 ? 'QR code series with this name already exists.' : error.message,
            error: error.message,
        });
    }
};

// Get single QR Code Series by ID
const getQRCodeSeriesById = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const record = await QRCodeSeries.findOne({ _id: id, deletedAt: null })
            .populate('cluster', 'name code address')
            .populate('qr_codes')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'QR code series not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'QR code series fetched successfully',
            data: record,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch QR code series',
            error: error.message,
        });
    }
};

// Update QR Code Series
const updateQRCodeSeries = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        req.body.updatedBy = req.user._id;

        const data = await updateQRCodeSeriesSchema.validate(req.body, {
            abortEarly: false,
        });

        const record = await QRCodeSeries.findOneAndUpdate(
            { _id: id, deletedAt: null },
            { $set: data },
            { new: true, runValidators: true }
        )
            .populate('cluster', 'name code address')
            .populate('qr_codes')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'QR code series not found',
            });
        }

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'QR code series updated successfully.',
            data: record,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
            status: false,
            message: error.code === 11000 ? 'Duplicate field value exists.' : 'Failed to update QR code series.',
            error: error.message,
        });
    }
};

// Delete QR Code Series (soft delete)
const deleteQRCodeSeries = async (req, res) => {
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

        const record = await QRCodeSeries.findOne({ _id: id, deletedAt: null });
        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'QR code series not found',
            });
        }

        await record.softDelete(req.user._id);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'QR code series deleted successfully',
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to delete QR code series',
            error: error.message,
        });
    }
};

export const QRCodeSeriesController = {
    getQRCodeSeries,
    createQRCodeSeries,
    getQRCodeSeriesById,
    updateQRCodeSeries,
    deleteQRCodeSeries,
};
