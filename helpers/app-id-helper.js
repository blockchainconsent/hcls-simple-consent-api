/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const axios = require('axios');
const rax = require('retry-axios');
const querystring = require('querystring');
const cloudIamHelper = require('./cloud-iam-helper');

const config = require('../config');
const logger = require('../config/logger').getLogger('app-id-helper');

const url = process.env.APP_ID_URL;
const clientID = process.env.APP_ID_CLIENT_ID;
const tenantID = process.env.APP_ID_TENANT_ID;
const secret = process.env.APP_ID_SECRET;
const apikey = process.env.APP_ID_IAM_KEY;

const oauthServerUrl = `${url}/oauth/v4/${tenantID}`;
const managementServerUrl = `${url}/management/v4/${tenantID}`;
const pingServerUrl = `${url}/oauth/v4/${tenantID}/publickeys`;

// eslint-disable-next-line complexity
const validateConfig = () => {
  let missingVar;
  if (!url) {
    missingVar = 'APP_ID_URL';
  } else if (!clientID) {
    missingVar = 'APP_ID_CLIENT_ID';
  } else if (!tenantID) {
    missingVar = 'APP_ID_TENANT_ID';
  } else if (!secret) {
    missingVar = 'APP_ID_SECRET';
  }

  if (missingVar) {
    throw new Error(`Invalid AppID config: missing variable '${missingVar}'`);
  }
};

const pingAppID = async () => {
  const { CancelToken } = axios;
  const source = CancelToken.source();
  const timeout = setTimeout(() => {
    source.cancel(`Request timed out after ${config.appID.timeout} ms`);
  }, config.appID.timeout);

  const pingClient = axios.create({
    baseURL: pingServerUrl,
    timeout: config.appID.timeout,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
  });

  try {
    await pingClient.get('/', { cancelToken: source.token }).finally(() => clearTimeout(timeout));
    logger.info('AppID health is OK');
    return true;
  } catch (error) {
    logger.error(`AppID health is not OK: ${error}`);
    return error;
  }
};

const appIdLoginClient = () => {
  const loginClient = axios.create({
    baseURL: `${oauthServerUrl}/token`,
    timeout: config.appID.timeout,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    auth: {
      username: clientID,
      password: secret,
    },
  });

  const retries = config.appID.retries || 1;
  const retryDelay = config.appID.retryDelay || 3000;

  // setup retry-axios config
  loginClient.defaults.raxConfig = {
    instance: loginClient,
    retry: retries,
    backoffType: 'static', // options are 'exponential' (default), 'static' or 'linear'
    noResponseRetries: retries, // retry when no response received (such as on ETIMEOUT)
    statusCodesToRetry: [[500, 599]], // retry only on 5xx responses (no retry on 4xx responses)
    retryDelay,
    httpMethodsToRetry: ['POST', 'GET', 'HEAD', 'PUT'],
    onRetryAttempt: (err) => {
      const cfg = rax.getConfig(err);
      logger.warn('No response received from AppID, retrying login request:');
      logger.warn(`Retry attempt #${cfg.currentRetryAttempt}`);
    },
  };

  rax.attach(loginClient);
  return loginClient;
};

const appIdMgmtClient = async () => {
  validateConfig();

  const token = await cloudIamHelper.getCloudIAMToken(apikey);

  const axClient = axios.create({
    baseURL: managementServerUrl,
    timeout: config.appID.timeout,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const retries = config.appID.retries || 1;
  const retryDelay = config.appID.retryDelay || 3000;

  // setup retry-axios config
  axClient.defaults.raxConfig = {
    instance: axClient,
    retry: retries,
    backoffType: 'static', // options are 'exponential' (default), 'static' or 'linear'
    noResponseRetries: retries, // retry when no response received (such as on ETIMEOUT)
    statusCodesToRetry: [[500, 599]], // retry only on 5xx responses (no retry on 4xx responses)
    retryDelay,
    httpMethodsToRetry: ['POST', 'GET', 'HEAD', 'PUT'],
    onRetryAttempt: (err) => {
      const cfg = rax.getConfig(err);
      logger.warn('No response received from AppID, retrying');
      logger.warn(`Retry attempt #${cfg.currentRetryAttempt}`);
    },
  };

  rax.attach(axClient);
  return axClient;
};

const appIdUserInfoClient = (token) => {
  const axClient = axios.create({
    baseURL: `${oauthServerUrl}/userInfo`,
    timeout: config.appID.timeout,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: token,
    },
  });

  const retries = config.appID.retries || 1;
  const retryDelay = config.appID.retryDelay || 3000;

  // setup retry-axios config
  axClient.defaults.raxConfig = {
    instance: axClient,
    retry: retries,
    backoffType: 'static', // options are 'exponential' (default), 'static' or 'linear'
    noResponseRetries: retries, // retry when no response received (such as on ETIMEOUT)
    statusCodesToRetry: [[500, 599]], // retry only on 5xx responses (no retry on 4xx responses)
    retryDelay,
    httpMethodsToRetry: ['POST', 'GET', 'HEAD', 'PUT'],
    onRetryAttempt: (err) => {
      const cfg = rax.getConfig(err);
      logger.warn('No response received from AppID, retrying');
      logger.warn(`Retry attempt #${cfg.currentRetryAttempt}`);
    },
  };

  rax.attach(axClient);
  return axClient;
};

const loginAppID = async (username, password) => {
  try {
    validateConfig();
    const loginClient = appIdLoginClient();
    const requestBody = {
      username,
      password,
      grant_type: 'password',
    };
    logger.debug('Calling AppID to retrieve auth token');
    const response = await loginClient.post('/', querystring.stringify(requestBody));
    logger.info('Login request to AppID was successful');

    return response.data;
  } catch (error) {
    logger.error(`Login request to AppID failed: ${error}`);
    const errorObj = new Error();
    if (error.response) {
      const errorResponse = error.response;
      errorObj.status = errorResponse.status;
      errorObj.statusText = errorResponse.statusText;
      if ('data' in errorResponse) {
        errorObj.message = errorResponse.data.error_description;
      }
    } else {
      errorObj.status = 500;
      errorObj.statusText = error.code;
      errorObj.message = error.message;
    }
    throw errorObj;
  }
};

// eslint-disable-next-line complexity
const getAppIDUserInfo = async (token) => {
  try {
    validateConfig();
    const userInfoClient = appIdUserInfoClient(token);
    const userInfo = await userInfoClient.post('/');

    return userInfo && (userInfo.data || {});
  } catch (error) {
    logger.error(`UserInfo request to AppID failed: ${error.message}`);

    const errorObj = new Error();
    if (error.response) {
      const errorResponse = error.response;
      errorObj.status = errorResponse.status;
      errorObj.statusText = errorResponse.statusText;
      if ('data' in errorResponse) {
        errorObj.message = errorResponse.data.error_description;
      }
    } else {
      errorObj.status = 500;
      errorObj.statusText = error.code;
      errorObj.message = error.message;
    }
    throw errorObj;
  }
};

// eslint-disable-next-line complexity
const getAppIDUserSub = (req, token) => {
  let callerID = '';
  if (
    req.appIdAuthorizationContext
        && req.appIdAuthorizationContext.accessTokenPayload
        && req.appIdAuthorizationContext.accessTokenPayload.sub
  ) {
    callerID = req.appIdAuthorizationContext.accessTokenPayload.sub;
    logger.debug('CallerID retrieved from AppID access token');
  } else {
    try {
      const userInfo = getAppIDUserInfo(token);
      callerID = userInfo.sub;
      if (!callerID) {
        throw new Error('Failed to get CallerID, user sub is empty');
      }
      logger.debug('CallerID retrieved from AppID user info');
    } catch (error) {
      const errMsg = `Failed to getAppIDUserInfo: ${error}`;
      logger.error(errMsg);
      throw new Error(errMsg);
    }
  }
  return callerID;
};

// eslint-disable-next-line complexity
const sendResetPasswordEmail = async (req) => {
  try {
    const { userId } = req.body;

    const client = await appIdMgmtClient();
    var { userResourceID }  = req;
    if(!userResourceID) {
      var userInfo = await client.get(`/cloud_directory/Users?query=${userId}`);
    }
    
    if (userResourceID || (userInfo && userInfo.data && userInfo.data.Resources && userInfo.data.Resources[0])) {
      const uuid = userResourceID || userInfo.data.Resources[0].id;
      const body = `uuid=${uuid}`;
      const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

      await client.post('/cloud_directory/resend/RESET_PASSWORD', body, { headers });
    }
  } catch (error) {
    const status = (error.response && error.respose.status) ? error.respose.status : 404;
    const message = (error.response && error.respose.data) ? error.respose.data : 'Password reset request failed.';

    return {
      status,
      message,
    };
  }

  return {
    status: 200,
    message: 'Password reset request submitted successfully.',
  };
};

const validateExistingUser = async (req, res, next) => {
  try {
    const { userId } = req.body;

    const client = await appIdMgmtClient();

    const userInfo = await client.get(`/cloud_directory/Users?query=${userId}`);
    if (userInfo && userInfo.data && userInfo.data.Resources && userInfo.data.Resources[0] && userInfo.data.Resources[0].id) {
      req.userResourceID= userInfo.data.Resources[0].id;
      return next();
    }else {
      return res.status(400).json({
        error: {
          message: 'Failed to validate existing user.',
        },
        currentTime: new Date().toISOString(),
      });
    }
  } catch (error) {
    const status = (error.response && error.respose.status) ? error.respose.status : 404;
    const message = (error.response && error.respose.data) ? error.respose.data : 'Failed to validate existing user.';

    return res.status(status).json({
      error: {
        message: message
      },
      currentTime: new Date().toISOString(),
    });
  }
};

module.exports = {
  loginAppID,
  getAppIDUserSub,
  sendResetPasswordEmail,
  pingAppID,
  appIdMgmtClient,
  validateExistingUser
};
