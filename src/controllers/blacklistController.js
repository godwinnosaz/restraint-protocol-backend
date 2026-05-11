const db = require('../utils/fileDb');
const { success, error } = require('../utils/response');

async function getBlacklist(req, res) {
  try {
    const blacklist = db.findMany('blacklist', () => true);
    // Since fileDb handles top-level arrays/objects differently, we might need to adjust.
    // If blacklist.json is an object with {domains, apps, keywords}, we fetch it directly.
    const fullBlacklist = db.getCollection('blacklist');
    return success(res, 'Blacklist fetched', fullBlacklist);
  } catch (err) {
    return error(res, 'Failed to fetch blacklist', err, 500);
  }
}

module.exports = {
  getBlacklist,
};
