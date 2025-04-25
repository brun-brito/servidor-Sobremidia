const fs = require('fs');
const path = require('path');

exports.generateScriptAnalytics = (analyticsData, paineis) => {
  return String.raw`
      const dadosApi = ${JSON.stringify(analyticsData)};
      const paineis = ${JSON.stringify(paineis)};
      ${fs.readFileSync(path.join(__dirname, 'analyticsFrontendScript.js'), 'utf8')}
`;
};