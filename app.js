/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

require('newrelic');
require('dotenv').config();

const atob = require('atob');
const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const fs = require('fs');
const https = require('https');
const morgan = require('morgan');
const passport = require('passport');
const path = require('path');

const swaggerUI = require('swagger-ui-express');
const swaggerDoc = require('./swagger.json');

const healthRoutes = require('./routes/health');
const liveRoutes = require('./routes/liveHealth');
const userRoutes = require('./routes/user');
const consentRoutes = require('./routes/consent');
const bcHelper = require('./helpers/blockchain-helper');
const { checkDeIdentifierEndpoint } = require('./helpers/deidentifier-helper');
const CloudantHelper = require('./db/cloudantDB');

const config = require('./config');

const tlsHelper = require('./helpers/tls-helper');
const logger = require('./config/logger').getLogger('app');

const app = express();

const port = process.env.PORT || process.env.VCAP_APP_PORT || 3002;

let useHTTPS = false;
let serverCert;
let serverKey;

// eslint-disable-next-line complexity
const preStartUp = () => {
  const tlsFolder = process.env.TLS_FOLDER_PATH || './config/tls';
  if (process.env.USE_HTTPS && process.env.USE_HTTPS.toLowerCase() === 'true' && fs.existsSync(tlsFolder)) {
    useHTTPS = true;
    serverCert = path.resolve(tlsFolder, 'tls.crt');
    serverKey = path.resolve(tlsFolder, 'tls.key');

    logger.info(`process.env.USE_HTTPS = ${process.env.USE_HTTPS}`);
    logger.info(`  Using server.key & server.cert from folder: TLS_FOLDER_PATH = ${tlsFolder}`);
    logger.info(`  server crt file = ${serverCert}`);
    logger.info(`  server key file = ${serverKey}`);
  }

  // TODO: ping de-identifier readiness route before startup

  logger.info(`NODE JS RUNNING ON ${process.version}`);
  logger.info(`process.env.PORT = ${port}`);
  logger.info(`process.env.NODE_ENV = ${process.env.NODE_ENV}`);
  logger.info(`process.env.APP_ID_URL = ${process.env.APP_ID_URL}`);
  logger.info(`process.env.APP_ID_TENANT_ID = ${process.env.APP_ID_TENANT_ID}`);

  process.on('unhandledRejection', (reason, p) => {
    logger.warn(`Unhandled Rejection at promise: ${JSON.stringify(p)} reason: ${reason}`);
  });

  process.on('uncaughtException', (err) => {
    logger.warn(`Uncaught exception = ${err}`);
    logger.warn(`Uncaught stack = ${err.stack}`);
  });
};

// Initiate cloudant database connection
const initDBConnection = async () => { 
  try {
    const cloudantClient = CloudantHelper.getInstance();
    await cloudantClient.setupCloudant();
    await cloudantClient.checkConnection();
    const dbName = config.rateLimit.dbName;
    await cloudantClient.getOrCreateDB(dbName);
  } catch (err) {
    const errMsg = `Error starting server. Failed to setup Cloudant: ${err}`;
    logger.error(errMsg);
    throw err;
  }
};


const onStartUp = async (err) => {
  if (err) {
    logger.error(`Error starting server: ${err}`);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }

  try {
    // Check DeIdentifier Readiness Endpoint before startup
    const isDevMode = config.devMode;
    if (!isDevMode) {
      await checkDeIdentifierEndpoint();
    }
  } catch (error) {
    logger.error(error);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }

  // enroll blockchain users
  try {
    await bcHelper.initializeGateway();
    logger.info(`Server running on port ${port}`);
  } catch (error) {
    logger.error(error);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
};

preStartUp();
app.use(cors());

// TODO: may want to change to short or tiny
app.use(morgan('dev'));
app.use(
  bodyParser.urlencoded({
    extended: false,
  }),
);
app.use(bodyParser.json());

app.use(passport.initialize());
app.enable('trust proxy');

// Inject TenantID from access token in req
// eslint-disable-next-line complexity
app.use((req, res, next) => {
  if (req.headers && req.headers.authorization && req.headers.authorization.includes('Bearer')) {
    try {
      const authorizationHeader = req.headers.authorization;
      const token = authorizationHeader.split(' ')[1];
      try {
        const encodedPayload = token.split('.')[1];
        const payload = JSON.parse(atob(encodedPayload));
        const { TenantID } = payload;
        req.TenantID = TenantID;
        logger.info('Injected TenantID in req');
      } catch (err) {
        logger.warn('Failed to parse Authorization header for TenantID');
      }
    } catch (err) {
      logger.error(err);
      logger.error('Failed to inject TenantID in req');
    }
  }
  next();
});

// routes which should handle requests
app.use('/simple-consent/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDoc));
app.use('/simple-consent/api/v1/health', healthRoutes);
app.use('/simple-consent/api/v1/live', liveRoutes);
app.use('/simple-consent/api/v1/users', userRoutes);
app.use('/simple-consent/api/v1/consent', consentRoutes);

app.use((req, res, next) => {
  const error = new Error('No route found');
  error.status = 404;
  next(error);
});

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message,
    },
  });
});

let server;
const start = () => {
  server = app.listen(port, onStartUp);
};
// Establish database connection
initDBConnection();

if (useHTTPS) {
  const foundKeyFiles = tlsHelper.validateSSLFiles(serverKey, serverCert);
  if (foundKeyFiles) {
    const options = {
      key: fs.readFileSync(serverKey),
      cert: fs.readFileSync(serverCert),
      secureOptions: tlsHelper.getSecureOptions(),
      ciphers: tlsHelper.getCiphersForServerOptions(),
      honorCipherOrder: true,
    };
    server = https.createServer(options, app).listen(port, onStartUp);
  } else {
    start();
  }
} else {
  start();
}

// Handle shutdown signals. Safely shutting down processes and closing connections
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

signalTraps.forEach((type) => {
  process.once(type, () => {
    logger.info(`Received kill '${type}' signal, shutting down gracefully`);
    server.close((err) => {
      if (err) {
        logger.error('An error while shutting down:', err);
        // eslint-disable-next-line no-process-exit
        process.exit(1);
      }
      // eslint-disable-next-line no-process-exit
      process.exit(0);
    });
  });
});

module.exports = app;
