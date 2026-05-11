const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '../db');

function getDbPath(collection) {
  return path.join(DB_DIR, `${collection}.json`);
}

function readAll(collection) {
  const filePath = getDbPath(collection);
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAll(collection, data) {
  const filePath = getDbPath(collection);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function findById(collection, id) {
  const records = readAll(collection);
  return records.find((r) => r.id === id) || null;
}

function findOne(collection, predicate) {
  const records = readAll(collection);
  return records.find(predicate) || null;
}

function findMany(collection, predicate) {
  const records = readAll(collection);
  return records.filter(predicate);
}

function insert(collection, record) {
  const records = readAll(collection);
  records.push(record);
  writeAll(collection, records);
  return record;
}

function updateById(collection, id, updates) {
  const records = readAll(collection);
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) return null;
  records[index] = { ...records[index], ...updates };
  writeAll(collection, records);
  return records[index];
}

function deleteById(collection, id) {
  const records = readAll(collection);
  const filtered = records.filter((r) => r.id !== id);
  writeAll(collection, filtered);
}

module.exports = {
  readAll,
  writeAll,
  findById,
  findOne,
  findMany,
  insert,
  updateById,
  deleteById,
};
