import httpStatus from '../../../utils/httpStatus';
import createResponse from '../../../utils/response';
import { extractCommonQueryParams, getIdFromParams } from '../../../utils/requestHelper';
import { getCommonSearchConditionForMasters } from '../../../utils/commonHelper';
import QRCodeSeries from './qrcode.model';
import {
    createQRCodeSchema,
    updateQRCodeSchema,
    updateGeneratedCodeSchema,
    bulkUpdateStatusSchema
} from './qrcode.validator';
import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';

/**
 * Generate PDF with actual QR codes using Puppeteer and QRCode library
 * Features:
 * - Real QR codes generated with qrcode library
 * - Company logo overlay on each QR code
 * - Professional card-like design
 * - 2-column layout with 8 QR codes per page
 * - A4 format with proper margins
 * @param {Object} series - QR code series data
 * @param {Array} codes - Array of individual QR codes to generate
 * @param {number} retryCount - Number of retries (default: 0)
 * @returns {Buffer} PDF buffer
 */
const generateQRCodePDF = async (series, codes, retryCount = 0) => {
    let browser;
    try {
        // Read logo file
        const logoPath = path.join(process.cwd(), 'static', 'images', 'gomotorcarLogo.jpg');
        let logoBase64 = '';

        try {
            if (fs.existsSync(logoPath)) {
                const logoBuffer = fs.readFileSync(logoPath);
                logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
                console.log('Logo loaded successfully');
            } else {
                console.log('Logo file not found at:', logoPath);
            }
        } catch (logoError) {
            console.log('Logo read error:', logoError.message);
        }

        // If no logo, create a simple text placeholder
        if (!logoBase64) {
            logoBase64 = 'data:image/svg+xml;base64,' + Buffer.from(`
                <svg width="120" height="35" xmlns="http://www.w3.org/2000/svg">
                    <rect width="120" height="35" fill="#1e40af"/>
                    <text x="60" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">GOMOTORCAR</text>
                </svg>
            `).toString('base64');
        }

        // Generate QR code data URLs for all codes
        console.log('Generating QR codes...');
        const qrCodePromises = codes.map(async (code) => {
            try {
                // Convert Mongoose document to plain object to access properties correctly
                const codeData = code.toObject ? code.toObject() : code;

                // Use prefix + serial as QR code content (e.g., "GMC2", "GMC6")
                const serialNumber = codeData.serial || 1;
                const prefix = series.prefix || 'GMC';
                const qrContent = `${prefix}${serialNumber}`; // QR code will contain prefix + serial

                console.log(`Generating QR code with content: "${qrContent}" for serial: ${serialNumber} (prefix: ${prefix})`);

                const qrDataUrl = await QRCode.toDataURL(qrContent, {
                    width: 200,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    },
                    errorCorrectionLevel: 'M' // Medium error correction to allow for logo overlay
                });
                return { ...codeData, qrDataUrl, qrContent };
            } catch (qrError) {
                console.error(`Error generating QR code for serial ${code.serial}:`, qrError);
                // Convert to plain object for fallback too
                const codeData = code.toObject ? code.toObject() : code;
                return { ...codeData, qrDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };
            }
        });

        const codesWithQR = await Promise.all(qrCodePromises);
        console.log(`Generated QR codes for ${codesWithQR.length} items`);

        // Debug: Log the first few codes to see their serial numbers and QR content
        console.log('Sample codes with serials and QR content:', codesWithQR.slice(0, 3).map(code => ({
            startingQrCodeId: code.startingQrCodeId,
            serial: code.serial,
            qrContent: code.qrContent,
            status: code.status,
            hasSerial: code.hasOwnProperty('serial')
        })));

        // Create business card style HTML content for QR codes
        const qrCodesPerPage = 6; // 6 codes per page (3 rows x 2 columns) for better spacing
        let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>QR Codes - ${series.apartmentName}</title>
    <style>
        @page {
            size: A4;
            margin: 15mm;
        }
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            line-height: 1.2;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #1e40af;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #1e40af;
            margin: 10px 0;
            font-size: 24px;
        }
        .header p {
            color: #666;
            margin: 5px 0;
            font-size: 14px;
        }
        .qr-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 20px;
        }
        .qr-card {
            border: 2px solid #1e40af;
            border-radius: 15px;
            padding: 15px;
            background: white;
            page-break-inside: avoid;
            min-height: 280px;
            display: flex;
            flex-direction: column;
            position: relative;
            box-shadow: 0 2px 8px rgba(30, 64, 175, 0.1);
        }
        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e5e7eb;
        }
        .company-logo {
            height: 35px;
            width: auto;
            max-width: 120px;
        }
        .help-info {
            text-align: right;
            font-size: 11px;
            color: #1e40af;
            font-weight: 600;
        }
        .qr-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex-grow: 1;
            margin: 15px 0;
            text-align: center;
        }
        .qr-code-container {
            margin-bottom: 15px;
        }
        .qr-code-image {
            width: 140px;
            height: 140px;
            display: block;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin: 0 auto;
        }
        .qr-series-info {
            font-size: 16px;
            color: #1e40af;
            font-weight: bold;
            font-family: 'Courier New', monospace;
        }
        .card-footer {
            text-align: center;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
        }
        .website {
            color: #1e40af;
            font-size: 12px;
            font-weight: 600;
        }
        .tagline {
            color: #666;
            font-size: 9px;
            margin-top: 2px;
        }
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>QR Code Series</h1>
        <p><strong>${series.apartmentName}</strong> (${series.apartmentCode})</p>
        <p>City: ${series.city} | Series: ${series.qrCodeSeries || 'N/A'}</p>
        <p>Generated: ${new Date().toLocaleDateString()} | Total: ${codesWithQR.length} QR Codes</p>
    </div>
`;

        // Generate QR codes in groups for pagination
        for (let i = 0; i < codesWithQR.length; i += qrCodesPerPage) {
            if (i > 0) {
                htmlContent += '<div class="page-break"></div>';
            }

            htmlContent += '<div class="qr-grid">';

            const pageQRCodes = codesWithQR.slice(i, i + qrCodesPerPage);

            for (let codeIndex = 0; codeIndex < pageQRCodes.length; codeIndex++) {
                const code = pageQRCodes[codeIndex];

                // Format the series number properly (e.g., "55-001")
                const seriesNumber = series.qrCodeSeries || '55';

                // Use the actual serial number from the database instead of array indexing
                const serialNumber = code.serial;
                console.log(`Debug - Code data:`, {
                    startingQrCodeId: code.startingQrCodeId,
                    serial: code.serial,
                    serialType: typeof code.serial,
                    allProps: Object.keys(code)
                });

                // Format as 2-digit number (55-02, 55-06, etc.)
                const formattedSerial = String(serialNumber || 1).padStart(2, '0');
                const seriesCode = `${seriesNumber}-${formattedSerial}`;

                console.log(`Generated series code: ${seriesCode} for QR: ${code.startingQrCodeId} (serial: ${serialNumber})`);

                htmlContent += `
                    <div class="qr-card">
                        <div class="card-header">
                            <img src="${logoBase64}" alt="GOMOTORCAR Logo" class="company-logo">
                            <div class="help-info">
                                Help Line<br>
                                9742977577
                            </div>
                        </div>
                        
                        <div class="qr-section">
                            <div class="qr-code-container">
                                <img src="${code.qrDataUrl}" alt="QR Code ${code.startingQrCodeId}" class="qr-code-image">
                            </div>
                            <div class="qr-series-info">${seriesCode}</div>
                        </div>
                        
                        <div class="card-footer">
                            <div class="website">www.gomotorcar.com</div>
                            <div class="tagline">Anything & Everything for your Car</div>
                        </div>
                    </div>
                `;
            }

            htmlContent += '</div>';
        }

        htmlContent += `
</body>
</html>`;

        console.log('Starting PDF generation with Puppeteer...');

        // Configure Puppeteer executable path
        const puppeteerConfig = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--no-first-run',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ],
            // Increase timeout and improve stability
            protocolTimeout: 120000,
            timeout: 120000
        };

        // Use environment variable for executable path (for production/Render)
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
            console.log('Using custom Chrome executable:', process.env.PUPPETEER_EXECUTABLE_PATH);
        }

        // Launch puppeteer with configuration
        browser = await puppeteer.launch(puppeteerConfig);

        console.log('Browser launched, creating page...');
        const page = await browser.newPage();

        // Set page timeout and error handling
        page.setDefaultTimeout(120000);
        page.setDefaultNavigationTimeout(120000);

        // Handle page errors
        page.on('error', (err) => {
            console.error('Page error:', err);
        });

        page.on('pageerror', (err) => {
            console.error('Page script error:', err);
        });

        console.log('Setting content...');
        await page.setContent(htmlContent, {
            waitUntil: 'domcontentloaded',
            timeout: 120000
        });

        // Wait for images to load
        console.log('Waiting for images to load...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('Generating PDF...');
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '15mm',
                bottom: '15mm',
                left: '15mm',
                right: '15mm'
            },
            timeout: 120000
        });

        console.log('Closing browser...');
        await browser.close();
        console.log(`PDF generation completed successfully, buffer size: ${pdfBuffer.length} bytes`);
        return pdfBuffer;

    } catch (error) {
        console.error('PDF generation error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        if (browser) {
            await browser.close().catch(console.error);
        }

        // If Chrome is not available, throw a specific error
        if (error.message.includes('Could not find Chrome')) {
            const chromeError = new Error('Chrome browser not available for PDF generation. Please install Chrome or use alternative download format.');
            chromeError.code = 'CHROME_NOT_FOUND';
            throw chromeError;
        }

        // If target closed error and we haven't retried yet, try once more
        if (error.message.includes('Target closed') && retryCount < 2) {
            console.log(`Target closed error, retrying... (attempt ${retryCount + 1})`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            return generateQRCodePDF(series, codes, retryCount + 1);
        }

        throw error;
    }
};

const getQRCodeSeries = async (req, res) => {
    try {
        const { limit = 1000, skip = 0, search, isActive } = extractCommonQueryParams(req);
        let query = { deletedAt: null };

        if (req.query.showActiveOnly == 'true') {
            query.isActive = true;
        }

        if (search) {
            query.$or = getCommonSearchConditionForMasters(search, [
                'prefix',
                'city',
                'apartmentName',
                'apartmentCode'
            ]);
        }

        if (isActive === 'true' || isActive === true) {
            query.isActive = true;
        } else if (isActive === 'false' || isActive === false) {
            query.isActive = false;
        }

        const [list, totalCount] = await Promise.all([
            QRCodeSeries.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email'),
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

const createQRCodeSeries = async (req, res) => {
    try {
        req.body.createdBy = req.user._id;
        req.body.updatedBy = req.user._id;

        const data = await createQRCodeSchema.validate(req.body, {
            abortEarly: false,
        });

        // Generate individual QR codes based on series range
        const generatedCodes = [];
        const seriesStart = data.qrCodeSeriesStart;
        const seriesEnd = data.qrCodeSeriesEnd;

        for (let i = seriesStart; i <= seriesEnd; i++) {
            generatedCodes.push({
                serial: i + 1, // Serial starts from 1
                startingQrCodeId: `${data.apartmentCode}${String(i).padStart(3, '0')}`,
                endingQrCodeId: `${data.apartmentCode}${String(i + 1).padStart(3, '0')}`,
                status: 'unused'
            });
        }

        data.generatedCodes = generatedCodes;

        const record = await QRCodeSeries.create(data);

        // Populate the created record for response
        const populatedRecord = await QRCodeSeries.findById(record._id)
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
            message: error.code === 11000 ? 'QR code series with this code already exists.' : error.message,
            error: error.message,
        });
    }
};

const getQRCodeSeriesById = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const record = await QRCodeSeries.findOne({ _id: id, deletedAt: null })
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

const updateQRCodeSeries = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        req.body.updatedBy = req.user._id;

        const data = await updateQRCodeSchema.validate(req.body, {
            abortEarly: false,
        });

        const record = await QRCodeSeries.findOneAndUpdate(
            { _id: id, deletedAt: null },
            { $set: data },
            { new: true, runValidators: true }
        )
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

// Get individual QR codes within a series
const getGeneratedCodes = async (req, res) => {
    try {
        const seriesId = getIdFromParams(req);
        const { limit = 100, skip = 0, status } = extractCommonQueryParams(req);

        let matchQuery = { _id: seriesId, deletedAt: null };

        const pipeline = [
            { $match: matchQuery },
            { $unwind: '$generatedCodes' },
        ];

        // Filter by status if provided
        if (status) {
            pipeline.push({ $match: { 'generatedCodes.status': status } });
        }

        pipeline.push(
            { $sort: { 'generatedCodes.serial': 1 } },
            { $skip: skip },
            { $limit: limit },
            { $replaceRoot: { newRoot: '$generatedCodes' } }
        );

        const [codes, totalCount] = await Promise.all([
            QRCodeSeries.aggregate(pipeline),
            QRCodeSeries.aggregate([
                { $match: matchQuery },
                { $unwind: '$generatedCodes' },
                ...(status ? [{ $match: { 'generatedCodes.status': status } }] : []),
                { $count: 'total' }
            ])
        ]);

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Generated QR codes retrieved successfully',
            data: {
                list: codes,
                count: totalCount[0]?.total || 0
            },
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch generated QR codes',
            error: error.message,
        });
    }
};

// Update individual generated code
const updateGeneratedCode = async (req, res) => {
    try {
        const seriesId = getIdFromParams(req);
        const { serial } = req.params;

        if (!serial) {
            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                status: false,
                message: 'Serial number is required',
            });
        }

        const data = await updateGeneratedCodeSchema.validate(req.body, {
            abortEarly: false,
        });

        // Add printed timestamp if status is being changed to printed
        if (data.status === 'printed' && !data.printedAt) {
            data.printedAt = new Date();
        }

        const record = await QRCodeSeries.findOneAndUpdate(
            {
                _id: seriesId,
                deletedAt: null,
                'generatedCodes.serial': parseInt(serial)
            },
            {
                $set: {
                    'generatedCodes.$': {
                        ...data,
                        serial: parseInt(serial),
                        printedAt: data.status === 'printed' ? (data.printedAt || new Date()) : data.printedAt
                    },
                    updatedBy: req.user._id
                }
            },
            { new: true }
        );

        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'QR code or series not found',
            });
        }

        const updatedCode = record.generatedCodes.find(code => code.serial === parseInt(serial));

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'Generated QR code updated successfully.',
            data: updatedCode,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.BAD_REQUEST,
            status: false,
            message: 'Failed to update generated QR code.',
            error: error.message,
        });
    }
};

// Bulk update status for multiple generated codes
const bulkUpdateGeneratedCodes = async (req, res) => {
    try {
        const seriesId = getIdFromParams(req);

        const data = await bulkUpdateStatusSchema.validate(req.body, {
            abortEarly: false,
        });

        const updateData = {
            status: data.status,
            ...(data.printedBy && { printedBy: data.printedBy }),
            ...(data.status === 'printed' && { printedAt: new Date() })
        };

        const record = await QRCodeSeries.findOneAndUpdate(
            {
                _id: seriesId,
                deletedAt: null
            },
            {
                $set: {
                    'generatedCodes.$[elem].status': updateData.status,
                    ...(updateData.printedBy && { 'generatedCodes.$[elem].printedBy': updateData.printedBy }),
                    ...(updateData.printedAt && { 'generatedCodes.$[elem].printedAt': updateData.printedAt }),
                    updatedBy: data.updatedBy
                }
            },
            {
                new: true,
                arrayFilters: [{ 'elem.serial': { $in: data.serials } }]
            }
        );

        if (!record) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'QR code series not found',
            });
        }

        const updatedCodes = record.generatedCodes.filter(code =>
            data.serials.includes(code.serial)
        );

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: `${updatedCodes.length} QR codes updated successfully.`,
            data: updatedCodes,
        });
    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.BAD_REQUEST,
            status: false,
            message: 'Failed to bulk update QR codes.',
            error: error.message,
        });
    }
};

const getQRCodeDashboard = async (req, res) => {
    try {
        const query = { deletedAt: null };

        // Aggregation pipeline for dashboard data
        const aggregation = [
            { $match: query },
            {
                $facet: {
                    totalSeries: [{ $count: 'count' }],
                    totalGeneratedCodes: [
                        { $unwind: '$generatedCodes' },
                        { $count: 'count' }
                    ],
                    codesByStatus: [
                        { $unwind: '$generatedCodes' },
                        {
                            $group: {
                                _id: '$generatedCodes.status',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    seriesByCity: [
                        {
                            $group: {
                                _id: '$city',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    latestSeries: [
                        { $sort: { createdAt: -1 } },
                        { $limit: 10 },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'createdBy',
                                foreignField: '_id',
                                as: 'createdBy'
                            }
                        },
                        { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } }
                    ]
                }
            }
        ];

        const result = await QRCodeSeries.aggregate(aggregation);
        const data = result[0] || {};

        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: 'QR code dashboard data retrieved successfully',
            data: {
                totalSeries: data.totalSeries[0]?.count || 0,
                totalGeneratedCodes: data.totalGeneratedCodes[0]?.count || 0,
                codesByStatus: data.codesByStatus || [],
                seriesByCity: data.seriesByCity || [],
                latestSeries: data.latestSeries || []
            }
        });
    } catch (error) {
        console.error('QR code dashboard error:', error);
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to fetch QR code dashboard',
            error: error.message
        });
    }
};

// Download QR codes as PDF or ZIP
const downloadQRCodes = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const { format = 'pdf', serials, range } = req.query;

        if (!id) {
            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                status: false,
                message: 'Series ID is required',
            });
        }

        // Find the QR code series
        const series = await QRCodeSeries.findOne({ _id: id, deletedAt: null });
        if (!series) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'QR code series not found',
            });
        }

        // Filter codes by serials or range if provided
        let codesToDownload = series.generatedCodes;

        if (serials) {
            const serialNumbers = serials.split(',').map(s => parseInt(s.trim()));
            codesToDownload = series.generatedCodes.filter(code =>
                serialNumbers.includes(code.serial)
            );
        } else if (range) {
            // Handle range parameter (e.g., "1-10" or "20-30")
            const [fromStr, toStr] = range.split('-');
            const fromIndex = parseInt(fromStr);
            const toIndex = parseInt(toStr);

            console.log(`Range download requested: ${fromIndex} to ${toIndex}`);

            if (isNaN(fromIndex) || isNaN(toIndex) || fromIndex < 1 || toIndex < fromIndex) {
                return createResponse({
                    res,
                    statusCode: httpStatus.BAD_REQUEST,
                    status: false,
                    message: 'Invalid range format. Use format: from-to (e.g., 1-10)',
                });
            }

            // Convert to 0-based index and slice the array
            codesToDownload = series.generatedCodes.slice(fromIndex - 1, toIndex);
            console.log(`Filtered to ${codesToDownload.length} codes for range ${fromIndex}-${toIndex}`);
        }

        // Only limit codes for range downloads to prevent excessive single requests
        // Allow full download when explicitly downloading all
        if (range && codesToDownload.length > 100) {
            console.log(`Limiting range download from ${codesToDownload.length} to 100 codes`);
            codesToDownload = codesToDownload.slice(0, 100);
        }

        console.log(`Preparing to download ${codesToDownload.length} QR codes`);
        console.log(`Download type: ${serials ? 'serials' : range ? 'range' : 'all'}`);


        if (codesToDownload.length === 0) {
            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                status: false,
                message: 'No QR codes found to download',
            });
        }

        // For now, return a simple text file with QR code data
        // In production, you would generate actual QR code images and create PDF/ZIP
        const qrData = codesToDownload.map(code => ({
            serial: code.serial,
            startingId: code.startingQrCodeId,
            endingId: code.endingQrCodeId,
            status: code.status,
            apartmentName: series.apartmentName,
            apartmentCode: series.apartmentCode,
            city: series.city,
        }));

        if (format === 'pdf') {
            try {
                console.log(`Generating PDF for series ${series._id} with ${codesToDownload.length} codes`);

                // Generate PDF with QR codes
                const pdfBuffer = await generateQRCodePDF(series, codesToDownload);

                console.log(`PDF generated successfully, buffer size: ${pdfBuffer.length} bytes`);

                // Validate that we actually got a PDF buffer (can be Buffer or Uint8Array)
                if (!pdfBuffer || pdfBuffer.length < 1000) {
                    throw new Error(`Invalid PDF buffer: ${typeof pdfBuffer}, length: ${pdfBuffer?.length}`);
                }

                // Convert to Buffer if it's not already
                const pdfBufferAsBuffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

                // Validate PDF buffer starts with PDF header
                const pdfHeader = pdfBufferAsBuffer.slice(0, 4).toString();
                if (pdfHeader !== '%PDF') {
                    throw new Error(`Invalid PDF format. Buffer starts with: ${pdfHeader}`);
                }

                console.log(`Valid PDF buffer confirmed, starts with: ${pdfHeader}`);

                // Update status of downloaded QR codes to 'printed'
                try {
                    const codesToUpdate = codesToDownload.map(code => ({
                        updateOne: {
                            filter: {
                                _id: series._id,
                                'generatedCodes.startingQrCodeId': code.startingQrCodeId
                            },
                            update: {
                                $set: {
                                    'generatedCodes.$.status': 'printed',
                                    'generatedCodes.$.printedAt': new Date(),
                                    'generatedCodes.$.printedBy': req.user?._id
                                }
                            }
                        }
                    }));

                    // Bulk update the status
                    await QRCodeSeries.bulkWrite(codesToUpdate);
                    console.log(`Updated status to 'printed' for ${codesToDownload.length} QR codes`);
                } catch (statusError) {
                    console.error('Failed to update QR code status:', statusError);
                    // Don't fail the download if status update fails
                }

                // Set proper PDF headers
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="qr-codes-${series.apartmentCode}-${series.code}.pdf"`);
                res.setHeader('Content-Length', pdfBufferAsBuffer.length);
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Accept-Ranges', 'bytes');

                // Send the PDF buffer directly
                return res.send(pdfBufferAsBuffer);
            } catch (pdfError) {
                console.error('PDF generation error details:', {
                    message: pdfError.message,
                    stack: pdfError.stack,
                    name: pdfError.name,
                    seriesId: series._id,
                    codeCount: codesToDownload.length
                });

                // Check if it's a Chrome installation issue
                if (pdfError.code === 'CHROME_NOT_FOUND' || pdfError.message.includes('Could not find Chrome')) {
                    return createResponse({
                        res,
                        statusCode: httpStatus.SERVICE_UNAVAILABLE,
                        status: false,
                        message: 'PDF generation service temporarily unavailable. Chrome browser not installed on server. Please contact administrator.',
                        error: 'Chrome browser required for PDF generation is not available on this server.'
                    });
                }

                // Fallback to enhanced text file if PDF generation fails
                res.setHeader('Content-Type', 'text/plain');
                res.setHeader('Content-Disposition', `attachment; filename="qr-codes-${series.apartmentCode}-${series.code}.txt"`);

                const textContent = `QR Code Series Report
============================
Apartment: ${series.apartmentName} (${series.apartmentCode})
City: ${series.city}
Prefix: ${series.prefix}
QR Series: ${series.qrCodeSeries || 'N/A'}
Generated: ${new Date().toLocaleString()}
Total Codes: ${qrData.length}

QR Code Details:
============================
${qrData.map((code, index) => `
${index + 1}. Serial: ${code.serial}
   Starting ID: ${code.startingId}
   Ending ID: ${code.endingId}
   Status: ${code.status.toUpperCase()}
   QR Series: ${series.qrCodeSeries || 'N/A'}
   ----------------------------------------`).join('\n')}

End of Report
============================`;

                return res.send(textContent);
            }
        } else if (format === 'zip') {
            // Return as JSON file instead of ZIP to avoid corruption
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="qr-codes-${series.apartmentCode}-${series.code}.json"`);

            const jsonContent = {
                metadata: {
                    apartmentName: series.apartmentName,
                    apartmentCode: series.apartmentCode,
                    city: series.city,
                    prefix: series.prefix,
                    generatedAt: new Date().toISOString(),
                    totalCodes: qrData.length
                },
                qrCodes: qrData.map(code => ({
                    serial: code.serial,
                    startingQrCodeId: code.startingId,
                    endingQrCodeId: code.endingId,
                    status: code.status,
                    // Add QR code data that would be used to generate actual QR images
                    qrData: {
                        text: code.startingId, // The text to encode in QR
                        size: 200, // Suggested QR code size
                        format: 'PNG'
                    }
                }))
            };

            return res.json(jsonContent);
        } else {
            return createResponse({
                res,
                statusCode: httpStatus.BAD_REQUEST,
                status: false,
                message: 'Invalid format. Supported formats: pdf, zip',
            });
        }

    } catch (error) {
        console.error('Download QR codes error:', error);
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to download QR codes',
            error: error.message,
        });
    }
};

// Generate QR code images (placeholder for future implementation)
const generateQRCodeImages = async (req, res) => {
    try {
        const id = getIdFromParams(req);
        const { serials } = req.body;

        const series = await QRCodeSeries.findOne({ _id: id, deletedAt: null });
        if (!series) {
            return createResponse({
                res,
                statusCode: httpStatus.NOT_FOUND,
                status: false,
                message: 'QR code series not found',
            });
        }

        // Filter codes by serials if provided
        let codesToGenerate = series.generatedCodes;
        if (serials && serials.length > 0) {
            codesToGenerate = series.generatedCodes.filter(code =>
                serials.includes(code.serial)
            );
        }

        // Placeholder response - in production, generate actual QR code images
        return createResponse({
            res,
            statusCode: httpStatus.OK,
            status: true,
            message: `QR code images generation initiated for ${codesToGenerate.length} codes`,
            data: {
                seriesId: id,
                totalCodes: codesToGenerate.length,
                codes: codesToGenerate.map(code => ({
                    serial: code.serial,
                    startingId: code.startingQrCodeId,
                    endingId: code.endingQrCodeId,
                    // In production, add: imageUrl, qrCodeData, etc.
                }))
            }
        });

    } catch (error) {
        return createResponse({
            res,
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            status: false,
            message: 'Failed to generate QR code images',
            error: error.message,
        });
    }
};

// Simple test endpoint for PDF generation
const testPDF = async (req, res) => {
    try {
        console.log('Testing simple PDF generation...');

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        const simpleHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Test PDF</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: blue; }
                </style>
            </head>
            <body>
                <h1>Test PDF Generation</h1>
                <p>This is a simple test PDF to verify Puppeteer is working.</p>
                <p>Current time: ${new Date().toISOString()}</p>
            </body>
            </html>
        `;

        await page.setContent(simpleHTML);
        const pdfBuffer = await page.pdf({ format: 'A4' });
        await browser.close();

        console.log(`Test PDF generated: ${pdfBuffer.length} bytes`);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="test.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);

        return res.end(pdfBuffer, 'binary');
    } catch (error) {
        console.error('Test PDF error:', error);
        return res.status(500).json({ error: error.message });
    }
};

// Simple QR code PDF test with real data
const testQRPDF = async (req, res) => {
    try {
        console.log('Testing QR PDF generation with sample data...');

        // Generate a few QR codes
        const sampleCodes = [
            { startingQrCodeId: 'GMX001', serial: 1 },
            { startingQrCodeId: 'GMX002', serial: 2 },
            { startingQrCodeId: 'GMX003', serial: 3 },
            { startingQrCodeId: 'GMX004', serial: 4 }
        ];

        const qrCodePromises = sampleCodes.map(async (code) => {
            try {
                const qrDataUrl = await QRCode.toDataURL(code.startingQrCodeId, {
                    width: 200,
                    margin: 2,
                    errorCorrectionLevel: 'M'
                });
                return { ...code, qrDataUrl };
            } catch (qrError) {
                console.error(`Error generating QR code for ${code.startingQrCodeId}:`, qrError);
                return { ...code, qrDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };
            }
        });

        const codesWithQR = await Promise.all(qrCodePromises);
        console.log(`Generated ${codesWithQR.length} QR codes`);

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Code Test</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .qr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
                    .qr-item { border: 2px solid #1e40af; border-radius: 10px; padding: 20px; text-align: center; }
                    .qr-code-image { width: 150px; height: 150px; margin: 0 auto 15px; display: block; }
                    .qr-info { font-weight: bold; font-size: 16px; margin-bottom: 8px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>QR Code Test PDF</h1>
                    <p>Generated: ${new Date().toLocaleString()}</p>
                </div>
                <div class="qr-grid">
                    ${codesWithQR.map(code => `
                        <div class="qr-item">
                            <img src="${code.qrDataUrl}" alt="QR Code ${code.startingQrCodeId}" class="qr-code-image">
                            <div class="qr-info">${code.startingQrCodeId}</div>
                            <div>Serial: ${code.serial}</div>
                        </div>
                    `).join('')}
                </div>
            </body>
            </html>
        `;

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        console.log(`QR PDF generated: ${pdfBuffer.length} bytes`);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="qr-test.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);

        return res.end(pdfBuffer, 'binary');
    } catch (error) {
        console.error('QR PDF test error:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const QRCodeController = {
    getQRCodeSeries,
    createQRCodeSeries,
    getQRCodeSeriesById,
    updateQRCodeSeries,
    deleteQRCodeSeries,
    getGeneratedCodes,
    updateGeneratedCode,
    bulkUpdateGeneratedCodes,
    getQRCodeDashboard,
    downloadQRCodes,
    generateQRCodeImages,
    testPDF,
    testQRPDF
};
