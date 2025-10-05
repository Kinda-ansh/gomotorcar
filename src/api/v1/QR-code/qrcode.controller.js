import httpStatus from '../../../utils/httpStatus';
import createResponse from '../../../utils/response';
import QRCodeSeriesModel from '../qrcode-series/qrcode-series.model';
import QRCodeModel from './qrcode.model';
import { generateQRCodesSchema, printQRCodesSchema } from './qrcode.validator';
import QRCodeGenerator from 'qrcode';
import axios from 'axios';
import Cryptr from 'cryptr';
import mongoose from 'mongoose';

const generateQRCodes = async (req, res) => {
    try {
        console.log('GENERATE QR CODE FUNCTION STARTS...');

        // Validate request body
        const data = await generateQRCodesSchema.validate(req.body, {
            abortEarly: false,
        });

        const { series, range } = data;

        // Check if series exists
        const seriesExists = await QRCodeSeriesModel.exists({ _id: series, deletedAt: null });
        if (!seriesExists) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'QR Code Series does not exist. Could not generate QR Codes.',
            });
        }

        // Get series data
        const seriesData = await QRCodeSeriesModel.findOne({ _id: series, deletedAt: null });

        if (!seriesData) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'QR Code Series not found.',
            });
        }

        // Parse range
        const starting = parseInt(range.trim().split('-')[0]);
        const ending = parseInt(range.trim().split('-')[1]);

        // Parse series range to validate against
        const seriesRangeStart = parseInt(seriesData.range.trim().split('-')[0]);
        const seriesRangeEnd = parseInt(seriesData.range.trim().split('-')[1]);

        // Validate that requested range is within series range
        if (starting < seriesRangeStart || ending > seriesRangeEnd || starting > seriesRangeEnd || ending < seriesRangeStart) {
            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                status: false,
                message: `Invalid range. QR codes can only be generated within the series range ${seriesData.range}. Requested range: ${range}`,
            });
        }

        // Check if codes in this range are already generated
        let generatedRange = seriesData.generated_range;
        let generatedStarting = starting;
        let generatedEnding = ending;

        if (generatedRange) {
            generatedStarting = parseInt(generatedRange.trim().split('-')[0]);
            generatedEnding = parseInt(generatedRange.trim().split('-')[1]);

            if (ending <= generatedEnding || starting <= generatedEnding) {
                return createResponse({
                    res,
                    statusCode: httpStatus.CONFLICT,
                    status: false,
                    message: 'QR Codes for the given range are already generated.',
                });
            }
        }

        // Generate QR code IDs array
        const qrCodesIDArray = [];
        for (let i = starting; i <= ending; i++) {
            const paddedSerial = i.toString().padStart(3, '0');
            const id = seriesData.identifierNumber + '-' + paddedSerial;
            qrCodesIDArray.push(id);
        }

        console.log(`Processing ${qrCodesIDArray.length} QR codes...`);

        const qrCodesData = [];
        const newQRCodeIds = [];

        // Process each QR code
        for (let i = 0; i < qrCodesIDArray.length; i++) {
            const qrCodeId = qrCodesIDArray[i];

            // Check if QR code already exists
            let qrcode = await QRCodeModel.findOne({
                series: series,
                deletedAt: null,
                'metadata.qr_code_id': qrCodeId
            });

            // If doesn't exist, create it
            if (!qrcode) {
                qrcode = await QRCodeModel.create({
                    series: series,
                    assigned: false,
                    printed: false,
                    scanned: false,
                    generated_at: new Date(),
                    generated_by: req.user._id,
                    createdBy: req.user._id,
                    updatedBy: req.user._id,
                    metadata: {
                        qr_code_id: qrCodeId,
                        sequence: starting + i
                    }
                });

                newQRCodeIds.push(qrcode._id);
                console.log(`Created QR code: ${qrCodeId}`);
            }

            // Generate encrypted string for QR code
            const cryptr = new Cryptr('myTotallySecretKey');
            const encryptedString = cryptr.encrypt(
                JSON.stringify({
                    series_id: seriesData._id.toString(),
                    qr_code_id: qrcode._id.toString()
                })
            );

            // Generate QR code image
            try {
                // Generate QR code as PNG data URL
                const qrImageUrl = `http://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(encryptedString)}&size=150x150&charset-source=ISO-8859-1&ecc=H`;

                // Generate simple QR code SVG (no card wrapper - frontend will handle the card)
                const qrCodeSVG = await QRCodeGenerator.toString(encryptedString, {
                    type: 'svg',
                    width: 150,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });

                // Update QR code with image data
                await QRCodeModel.findByIdAndUpdate(
                    qrcode._id,
                    { image_data: qrCodeSVG }
                );

                qrCodesData.push({
                    id: qrcode._id,
                    qr_code_id: qrCodeId,
                    status: 'generated'
                });

                console.log(`Generated QR code ${i + 1}/${qrCodesIDArray.length}: ${qrCodeId}`);
            } catch (qrError) {
                console.error(`Error generating QR image for ${qrCodeId}:`, qrError.message);
                qrCodesData.push({
                    id: qrcode._id,
                    qr_code_id: qrCodeId,
                    status: 'error'
                });
            }
        }

        // Update series with generated range and add new QR code IDs if any were created
        const updateData = {
            generated_range: generatedStarting + '-' + ending,
            updatedBy: req.user._id
        };

        if (newQRCodeIds.length > 0) {
            updateData.$push = { qr_codes: { $each: newQRCodeIds } };
        }

        // Set next_to_assign if not already set
        if (!seriesData.next_to_assign) {
            const rangeStart = seriesData.range.trim().split('-')[0];
            const paddedSerial = rangeStart.padStart(3, '0');
            updateData.next_to_assign = seriesData.identifierNumber + '-' + paddedSerial;
        }

        await QRCodeSeriesModel.findByIdAndUpdate(
            series,
            updateData,
            { new: true }
        );

        console.log('GENERATE QR CODE FUNCTION ENDS!');

        return createResponse({
            res,
            statusCode: httpStatus.CREATED,
            status: true,
            message: `${qrCodesData.length} QR Codes generated successfully.`,
            data: {
                generated_count: qrCodesData.length,
                range: `${starting}-${ending}`,
                qr_codes: qrCodesData
            },
        });

    } catch (error) {
        console.error('GENERATE QR CODE FUNCTION [ERROR]:', error);

        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Internal Server Error. Could not generate QR Codes.',
            error: error.message,
        });
    }
};




const printQRCodes = async (req, res) => {
    try {
        console.log('PRINT QR CODE FUNCTION STARTS...');

        // Validate request body
        const data = await printQRCodesSchema.validate(req.body, {
            abortEarly: false,
        });

        const { series, range } = data;

        // Check if series exists
        const seriesExists = await QRCodeSeriesModel.exists({ _id: series, deletedAt: null });
        if (!seriesExists) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'QR Code Series does not exist.',
            });
        }

        // Get series data
        const seriesData = await QRCodeSeriesModel.findOne({ _id: series, deletedAt: null });

        if (!seriesData) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'QR Code Series not found.',
            });
        }

        // Parse range
        const starting = parseInt(range.trim().split('-')[0]);
        const ending = parseInt(range.trim().split('-')[1]);

        // Parse series range to validate against
        const seriesRangeStart = parseInt(seriesData.range.trim().split('-')[0]);
        const seriesRangeEnd = parseInt(seriesData.range.trim().split('-')[1]);

        // Validate that requested range is within series range
        if (starting < seriesRangeStart || ending > seriesRangeEnd || starting > seriesRangeEnd || ending < seriesRangeStart) {
            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                status: false,
                message: `Invalid range. QR codes can only be printed within the series range ${seriesData.range}. Requested range: ${range}`,
            });
        }

        // Check if QR codes are generated for this range
        const generatedRange = seriesData.generated_range;
        if (!generatedRange) {
            return createResponse({
                res,
                statusCode: httpStatus.CONFLICT,
                status: false,
                message: 'No QR Codes are generated for the given QR Code Series. Please generate first.',
            });
        }

        const generatedStarting = parseInt(generatedRange.trim().split('-')[0]);
        const generatedEnding = parseInt(generatedRange.trim().split('-')[1]);

        // Validate if requested range is within generated range
        if (ending > generatedEnding || starting < generatedStarting) {
            return createResponse({
                res,
                statusCode: httpStatus.CONFLICT,
                status: false,
                message: `No QR Codes are generated for the given range. Generated range is ${generatedRange}.`,
            });
        }

        // Generate QR code IDs array for the requested range
        const qrCodesIDArray = [];
        for (let i = starting; i <= ending; i++) {
            const paddedSerial = i.toString().padStart(3, '0');
            const id = seriesData.identifierNumber + '-' + paddedSerial;
            qrCodesIDArray.push(id);
        }

        console.log(`Fetching ${qrCodesIDArray.length} QR codes for printing...`);

        // Fetch QR codes by metadata.qr_code_id
        const qrCodesData = await QRCodeModel.find({
            series: series,
            deletedAt: null,
            'metadata.qr_code_id': { $in: qrCodesIDArray }
        })
            .populate('series', 'name code identifierNumber range')
            .populate('generated_by', 'name email')
            .populate('printed_by', 'name email')
            .sort({ 'metadata.sequence': 1, generated_at: 1 });

        if (qrCodesData.length === 0) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'No QR codes found for the given range.',
            });
        }

        // Update QR codes as printed
        const qrCodeIds = qrCodesData.map(qr => qr._id);
        await QRCodeModel.updateMany(
            { _id: { $in: qrCodeIds } },
            {
                $set: {
                    printed: true,
                    printed_at: new Date(),
                    printed_by: req.user._id,
                    updatedBy: req.user._id
                }
            }
        );

        console.log(`Marked ${qrCodeIds.length} QR codes as printed.`);
        console.log('PRINT QR CODE FUNCTION ENDS!');

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: `${qrCodesData.length} QR Codes retrieved for printing.`,
            data: {
                count: qrCodesData.length,
                range: `${starting}-${ending}`,
                series: {
                    name: seriesData.name,
                    code: seriesData.code,
                    identifierNumber: seriesData.identifierNumber
                },
                qr_codes: qrCodesData.map(qr => ({
                    _id: qr._id,
                    code: qr.code,
                    qr_code_id: qr.metadata.get('qr_code_id'),
                    image_data: qr.image_data,
                    status: qr.status,
                    generated_at: qr.generated_at,
                    printed_at: qr.printed_at
                }))
            },
        });

    } catch (error) {
        console.error('PRINT QR CODE FUNCTION [ERROR]:', error);

        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Internal Server Error. Could not retrieve QR Codes for printing.',
            error: error.message,
        });
    }
};

// Get generated QR codes with filters
const getGeneratedQRCodes = async (req, res) => {
    try {
        console.log('GET GENERATED QR CODES FUNCTION STARTS...');

        const {
            limit = 100,
            skip = 0,
            series,
            status,
            generated_date_from,
            generated_date_to
        } = req.query;

        // Build query
        let query = { deletedAt: null };

        // Filter by series ID
        if (series) {
            if (!mongoose.Types.ObjectId.isValid(series)) {
                return createResponse({
                    res,
                    statusCode: httpStatus.BAD_REQUEST,
                    status: false,
                    message: 'Invalid series ID',
                });
            }
            query.series = series;
        }

        // Filter by status (now using boolean fields)
        if (status) {
            if (status === 'unassigned') {
                query.assigned = false;
                query.printed = false;
                query.scanned = false;

            } else if (status === 'assigned') {
                query.assigned = true;
            } else if (status === 'printed') {
                query.printed = true;
            } else if (status === 'scanned') {
                query.scanned = true;
            }
        }

        // Filter by generated date range
        if (generated_date_from || generated_date_to) {
            query.generated_at = {};
            if (generated_date_from) {
                query.generated_at.$gte = new Date(generated_date_from);
            }
            if (generated_date_to) {
                // Add one day to include the entire end date
                const endDate = new Date(generated_date_to);
                endDate.setDate(endDate.getDate() + 1);
                query.generated_at.$lte = endDate;
            }
        }

        console.log('Query:', JSON.stringify(query));

        // Get QR codes with pagination
        const [qrCodes, totalCount, statusCounts] = await Promise.all([
            QRCodeModel.find(query)
                .populate('series', 'name code identifierNumber range')
                .populate('generated_by', 'name email')
                .populate('assigned_to', 'name email')
                .populate('printed_by', 'name email')
                .sort({ 'metadata.sequence': 1, generated_at: 1 })
                .skip(parseInt(skip))
                .limit(parseInt(limit)),
            QRCodeModel.countDocuments(query),
            // Get status counts based on boolean fields
            QRCodeModel.aggregate([
                { $match: { deletedAt: null, ...(series && { series: new mongoose.Types.ObjectId(series) }) } },
                {
                    $group: {
                        _id: null,
                        unassigned: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$assigned', false] },
                                            { $eq: ['$printed', false] },
                                            { $eq: ['$scanned', false] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        assigned: { $sum: { $cond: ['$assigned', 1, 0] } },
                        printed: { $sum: { $cond: ['$printed', 1, 0] } },
                        scanned: { $sum: { $cond: ['$scanned', 1, 0] } }
                    }
                }
            ])
        ]);

        console.log(`Found ${qrCodes.length} QR codes (Total: ${totalCount})`);
        console.log('GET GENERATED QR CODES FUNCTION ENDS!');

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Generated QR codes retrieved successfully',
            data: {
                list: qrCodes.map(qr => ({
                    _id: qr._id,
                    code: qr.code,
                    qr_code_id: qr.metadata.get('qr_code_id'),
                    sequence: qr.metadata.get('sequence'),
                    assigned: qr.assigned,
                    printed: qr.printed,
                    scanned: qr.scanned,
                    image_data: qr.image_data,
                    series: qr.series,
                    generated_at: qr.generated_at,
                    generated_by: qr.generated_by,
                    assigned_to: qr.assigned_to,
                    assigned_at: qr.assigned_at,
                    printed_at: qr.printed_at,
                    printed_by: qr.printed_by,
                    scanned_at: qr.scanned_at,
                    scanned_by: qr.scanned_by,
                    isActive: qr.isActive,
                    createdAt: qr.createdAt,
                    updatedAt: qr.updatedAt
                })),
                count: totalCount,
                pagination: {
                    limit: parseInt(limit),
                    skip: parseInt(skip),
                    hasMore: totalCount > parseInt(skip) + qrCodes.length
                },
                statusCounts: statusCounts.length > 0 ? statusCounts[0] : {}
            },
        });

    } catch (error) {
        console.error('GET GENERATED QR CODES FUNCTION [ERROR]:', error);

        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch generated QR codes',
            error: error.message,
        });
    }
};

export const QRCodeController = {
    generateQRCodes,
    printQRCodes,
    getGeneratedQRCodes,
};
