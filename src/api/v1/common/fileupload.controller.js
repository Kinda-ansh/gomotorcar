const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const dotenv = require('dotenv');
const { default: createResponse } = require('../../../utils/response');
const { default: httpStatus } = require('../../../utils/httpStatus');

dotenv.config();

// Cloudinary config (keep keys in .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup (in-memory)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Helper to upload a buffer to Cloudinary using upload_stream
const uploadBufferToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });

// Single file upload handler
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return createResponse({
        res,
        statusCode: httpStatus.BAD_REQUEST,
        status: false,
        message: 'No file uploaded',
      });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: process.env.CLOUDINARY_FOLDER || 'uploads',
      resource_type: 'auto',
    });

    return createResponse({
      res,
      statusCode: httpStatus.OK,
      status: true,
      message: 'File uploaded successfully',
      data: { location: [result.secure_url], public_id: result.public_id },
    });
  } catch (error) {
    return createResponse({
      res,
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      status: false,
      message: 'Failed to upload file',
      error: error.message,
    });
  }
};

// Multiple files upload handler
const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return createResponse({
        res,
        statusCode: httpStatus.BAD_REQUEST,
        status: false,
        message: 'No files uploaded',
      });
    }

    const uploadResults = await Promise.all(
      req.files.map(async (file) => {
        const result = await uploadBufferToCloudinary(file.buffer, {
          folder: process.env.CLOUDINARY_FOLDER || 'uploads',
          resource_type: 'auto',
        });
        return {
          fileUrl: result.secure_url,
          publicId: result.public_id,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        };
      })
    );

    return createResponse({
      res,
      statusCode: httpStatus.OK,
      status: true,
      message: `Successfully uploaded ${uploadResults.length} files`,
      data: uploadResults,
    });
  } catch (error) {
    return createResponse({
      res,
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      status: false,
      message: 'Failed to upload files',
      error: error.message,
    });
  }
};

module.exports = {
  FileUploadController: {
    uploadFile,
    uploadMultipleFiles,
    upload,
  },
};