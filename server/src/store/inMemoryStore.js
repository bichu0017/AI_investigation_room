const { saveCase, getCase, listCases, memoryCases } = require('./caseStore');

module.exports = {
  saveCase,
  getCase,
  listCases,
  cases: memoryCases,
};
