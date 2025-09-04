import httpStatus from '../../../utils/httpStatus';
import createResponse from '../../../utils/response';
import {
  extractCommonQueryParams,
  getIdFromParams,
  getDataFromParams,
  getUserIdFromRequest,
} from '../../../utils/requestHelper';
import River from './river.model';
import { createRiverSchema, updateRiverSchema } from './river.validator';
import { getCommonSearchConditionForMasters } from '../../../utils/commonHelper';

const getRivers = async (req, res) => {
  try {
    const { limit = 1000, skip = 0, search, isActive } = extractCommonQueryParams(req);
    let query = { deletedAt: null };
    if (req.query.showActiveOnly == 'true') {
      query.isActive = true;
    }

    if (search) {
      query.$or = getCommonSearchConditionForMasters(search);
    }

    if (isActive === 'true' || isActive === true) {
      query.isActive = true;
    } else if (isActive === 'false' || isActive === false) {
      query.isActive = false;
    }

    const [list, totalCount] = await Promise.all([
      River.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      River.countDocuments(query),
    ]);

    return createResponse({
      res,
      statusCode: httpStatus.OK,
      status: true,
      message: 'Rivers retrieved',
      data: { list: list, count: totalCount },
    });
  } catch (error) {
    return createResponse({
      res,
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Failed to fetch rivers',
      status: false,
      error: error.message,
    });
  }
};

const createRiver = async (req, res) => {
  try {
    req.body.createdBy = req.user._id;
    req.body.updatedBy = req.user._id;

    const data = await createRiverSchema.validate(req.body, {
      abortEarly: false,
    });

    const river = await River.create(data);

    return createResponse({
      res,
      statusCode: httpStatus.CREATED,
      status: true,
      message: 'River created successfully.',
      data: river,
    });
  } catch (error) {
    return createResponse({
      res,
      statusCode:
        error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
      status: false,
      message:
        error.code === 11000
          ? 'River with this name or code already exists.'
          : error.message,
      error: error.message,
    });
  }
};

const getRiver = async (req, res) => {
  try {
    const id = getIdFromParams(req);
    const river = await River.findOne({ _id: id, deletedAt: null });

    if (!river) {
      return createResponse({
        res,
        statusCode: httpStatus.NOT_FOUND,
        status: false,
        message: 'River not found',
      });
    }

    return createResponse({
      res,
      statusCode: httpStatus.OK,
      status: true,
      message: 'River fetched successfully',
      data: river,
    });
  } catch (error) {
    return createResponse({
      res,
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      status: false,
      message: 'Failed to fetch river',
      error: error.message,
    });
  }
};

const updateRiver = async (req, res) => {
  try {
    const id = getIdFromParams(req);
    req.body.updatedBy = req.user._id;

    const data = await updateRiverSchema.validate(req.body, {
      abortEarly: false,
    });

    const river = await River.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: data },
      { new: true }
    );

    if (!river) {
      return createResponse({
        res,
        statusCode: httpStatus.NOT_FOUND,
        status: false,
        message: 'River not found',
      });
    }

    return createResponse({
      res,
      statusCode: httpStatus.OK,
      status: true,
      message: 'River updated successfully.',
      data: river,
    });
  } catch (error) {
    return createResponse({
      res,
      statusCode:
        error.code === 11000 ? httpStatus.CONFLICT : httpStatus.BAD_REQUEST,
      status: false,
      message:
        error.code === 11000
          ? 'Duplicate field value exists.'
          : 'Failed to update river.',
      error: error.message,
    });
  }
};

const deleteRiver = async (req, res) => {
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
    const updatedBy = getUserIdFromRequest(req);

    const river = await River.findOne({ _id: id, deletedAt: null });
    if (!river) {
      return createResponse({
        res,
        statusCode: httpStatus.NOT_FOUND,
        status: false,
        message: 'River not found',
      });
    }
    await river.softDelete(updatedBy);

    return createResponse({
      res,
      statusCode: httpStatus.OK,
      status: true,
      message: 'River deleted successfully',
    });
  } catch (error) {
    return createResponse({
      res,
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      status: false,
      message: 'Failed to delete river',
      error: error.message,
    });
  }
};

export const RiverController = {
  getRivers,
  createRiver,
  getRiver,
  updateRiver,
  deleteRiver
};
