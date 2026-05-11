const authService = require('../services/authService');
const userService = require('../services/userService');
const { success, error } = require('../utils/response');

async function register(req, res) {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return error(res, 'Username, email, and password are required', '', 400);
    }

    if (password.length < 6) {
      return error(res, 'Password must be at least 6 characters long', '', 400);
    }

    const result = await authService.register({ username, email, password });
    return success(res, 'Registration successful', result);
  } catch (err) {
    if (err.message === 'Email already in use') {
      return error(res, err.message, '', 409);
    }
    return error(res, 'Registration failed', err.message, 500);
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return error(res, 'Email and password are required', '', 400);
    }

    const result = await authService.login({ email, password });
    return success(res, 'Login successful', result);
  } catch (err) {
    if (err.message === 'Invalid email or password') {
      return error(res, err.message, '', 401);
    }
    return error(res, 'Login failed', err.message, 500);
  }
}

async function getMe(req, res) {
  try {
    const user = await userService.getUserById(req.user.id);
    if (!user) {
      return error(res, 'User not found', '', 404);
    }
    delete user.password_hash;
    return success(res, 'User data fetched', { user });
  } catch (err) {
    return error(res, 'Failed to get user data', err.message, 500);
  }
}

async function getDemoUser(req, res) {
  try {
    const result = await authService.getDemoUserToken();
    return success(res, 'Demo user session active', result);
  } catch (err) {
    return error(res, 'Failed to get demo user', err.message, 500);
  }
}

async function logout(req, res) {
  // JWT is stateless, so we just return success. 
  // Client should remove the token.
  return success(res, 'Logged out successfully');
}

module.exports = { 
  register, 
  login, 
  getMe,
  getDemoUser,
  logout
};
