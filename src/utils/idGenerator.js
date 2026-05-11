const { v4: uuidv4 } = require('uuid');

function generateId(prefix = '') {
  const id = uuidv4().replace(/-/g, '').substring(0, 12);
  return prefix ? `${prefix}_${id}` : id;
}

module.exports = { generateId };
