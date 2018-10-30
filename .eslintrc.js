const baseConfig = require('./script/.eslintrc');
const rules = {
  ...baseConfig.rules,
  quotes: 'off'
};

module.exports = { ...baseConfig, rules };
