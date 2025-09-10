import User from '../api/v1/User/user.model';
import jwtUtils from '../utils/jwtHelper';
import CookieService from '../services/cookie.service';
import createResponse from '../utils/response';

// eslint-disable-next-line consistent-return
const auth = async (req, res, next) => {
  try {
    // Debug logging for production troubleshooting
    console.log('Auth Middleware - Request URL:', req.url);
    console.log('Auth Middleware - Headers:', {
      authorization: req.header('Authorization') ? 'Present' : 'Missing',
      cookie: req.header('Cookie') ? 'Present' : 'Missing',
    });

    let token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      token = CookieService.getCookie(req, 'token');
      console.log('Auth Middleware - Token from cookie:', token ? 'Found' : 'Not found');
    } else {
      console.log('Auth Middleware - Token from Authorization header:', 'Found');
    }

    if (!token) {
      console.log('Auth Middleware - No token found in headers or cookies');
      return createResponse({
        res,
        statusCode: 401,
        status: false,
        message: 'Authorization token is missing',
      });
    }

    console.log('Auth Middleware - Attempting to verify token');
    const decoded = jwtUtils.verifyToken(token);

    if (!decoded) {
      console.log('Auth Middleware - Token verification failed');
      return createResponse({
        res,
        statusCode: 401,
        status: false,
        message: 'Invalid token',
      });
    }

    console.log('Auth Middleware - Token verified successfully, user ID:', decoded.id);
    let user = await User.findById(decoded.id).populate('userRole');

    if (!user) {
      console.log('Auth Middleware - User not found in database:', decoded.id);
      return createResponse({
        res,
        statusCode: 401,
        status: false,
        message: 'User not found',
      });
    }

    console.log('Auth Middleware - User found and authenticated:', user.email);

    req.adminuser = user;
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth Middleware - Error:', error.message);
    console.error('Auth Middleware - Stack:', error.stack);
    return res.status(401).json({
      error: 'Not authorized to access this resource',
      status: false,
      message: 'Not authorized to access this resource',
    });
  }
};

module.exports = auth;
