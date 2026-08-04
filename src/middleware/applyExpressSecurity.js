const helmet = require("helmet");
const {apiLimiter} = require("./security");

function applyExpressSecurity(app) {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: {policy: "cross-origin"},
  }));
  app.use(apiLimiter);
}

module.exports = {applyExpressSecurity};
