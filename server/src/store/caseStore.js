const mongoose = require('mongoose');
const Case = require('../models/Case');

const memoryCases = new Map();

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

async function saveCase(caseDoc) {
  if (!caseDoc || !caseDoc.publicId) {
    return caseDoc;
  }

  // Always update in-memory cache
  memoryCases.set(caseDoc.publicId, caseDoc);

  if (isMongoConnected()) {
    try {
      await Case.findOneAndUpdate(
        { publicId: caseDoc.publicId },
        caseDoc,
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      console.warn('Failed to persist case to MongoDB, retained in memory:', error.message);
    }
  }

  return caseDoc;
}

async function getCase(publicId) {
  if (!publicId) {
    return null;
  }

  if (isMongoConnected()) {
    try {
      const doc = await Case.findOne({ publicId }).select('+solution').lean();
      if (doc) {
        memoryCases.set(publicId, doc);
        return doc;
      }
    } catch (error) {
      console.warn('Failed to read case from MongoDB, using memory:', error.message);
    }
  }

  return memoryCases.get(publicId) || null;
}

async function listCases() {
  if (isMongoConnected()) {
    try {
      return await Case.find().lean();
    } catch (error) {
      console.warn('Failed to list cases from MongoDB, using memory:', error.message);
    }
  }

  return Array.from(memoryCases.values());
}

module.exports = {
  saveCase,
  getCase,
  listCases,
  isMongoConnected,
  memoryCases,
};
