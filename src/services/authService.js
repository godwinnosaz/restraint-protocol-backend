const bcrypt = require('bcryptjs');
const userService = require('./userService');
const { generateToken } = require('../utils/jwt');

async function register({ username, email, password }) {
  const existingUser = await userService.getUserByEmail(email);
  if (existingUser) {
    throw new Error('Email already in use');
  }

  const password_hash = await bcrypt.hash(password, 10);
  const user = await userService.createUser({ username, email, password_hash });
  
  const token = generateToken({ id: user.uuid, email: user.email });
  
  // Remove sensitive data
  delete user.password_hash;
  
  return { user, token };
}

async function login({ email, password }) {
  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const token = generateToken({ id: user.uuid, email: user.email });
  
  // Remove sensitive data
  delete user.password_hash;
  
  return { user, token };
}

async function getDemoUserToken() {
  let user = await userService.getDemoUser();
  
  if (!user) {
    // Create demo user if not exists
    const password_hash = await bcrypt.hash('demo123', 10);
    user = await userService.createUser({
      username: 'Demo User',
      email: 'demo@restraint.app',
      password_hash
    });
  }

  const token = generateToken({ id: user.uuid, email: user.email });
  
  delete user.password_hash;
  
  return { user, token };
}

module.exports = {
  register,
  login,
  getDemoUserToken
};
