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
const qs = require('querystring');
const kpHelper = require('./keyprotect-helper');

const config = require('../config');
const { TENANT_FIELDS } = require('./constants');

const logger = require('../config/logger').getLogger('fhir-id-helper');

const getDataFromTenant = async (tenantId) => {
  const keyName = `fhir-connection-${tenantId}`;

  const tenantData = await kpHelper.getNewestKeyByName(keyName);
  if (!tenantData) {
    logger.error(`Caller's TenantID ${tenantId} is not onboarded`);
    throw new Error(`Caller's ${tenantId} is not onboarded`);
  }

  const missingVars = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const key of TENANT_FIELDS) {
    if (!Object.keys(tenantData[`${tenantId}`]).includes(key)) {
      missingVars.push(key);
    }
  }
  if (missingVars.length) {
    const errMsg = `Please check configuration, the following variables are empty: ${JSON.stringify(missingVars)}`;
    throw new Error(errMsg);
  }
  logger.info(`TENANT ID: ${tenantId}`);
  return tenantData[`${tenantId}`];
};

const appIdLoginClient = (token, { appIdFhirUrl, appIdFhirTenantId }) => {
  const axiosClient = axios.create({
    baseURL: `${appIdFhirUrl}/oauth/v4/${appIdFhirTenantId}/token`,
    timeout: config.appID.timeout,
    headers: {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const retries = config.appID.retries || 1;
  const retryDelay = config.appID.retryDelay || 3000;

  // setup retry-axios config
  axiosClient.defaults.raxConfig = {
    instance: axiosClient,
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

  rax.attach(axiosClient);
  return axiosClient;
};

const fhirLoginClient = (tenantId, appIDToken, authCredToken, appIdFhirHost) => {
  const axiosClient = axios.create({
    baseURL: `${appIdFhirHost}/patient-access-support/v4/Patient`,
    headers: {
      'x-introspect-basic-authorization-header': authCredToken,
      'x-fhir-tenant-id': tenantId,
      Authorization: `Bearer ${appIDToken}`,
    },
  });

  return axiosClient;
};

// This is a utility function that refines the FHIR server response into just the fields we need to display
// eslint-disable-next-line complexity
const processPatientResponse = (data) => {
  const profile = {
    family: '', given: [], prefix: [], email: '',
  };
  const { name, telecom } = data;

  if (name && name[0]) {
    profile.family = name[0].family || '';
    profile.given = name[0].given || [];
    profile.prefix = name[0].prefix || [];
  }

  if (telecom && telecom[0]) {
    const emailEntry = telecom.find((entry) => entry.system === 'email');
    profile.email = (emailEntry && emailEntry.value) ? emailEntry.value : '';
  }

  return profile;
};

// eslint-disable-next-line complexity
const getPatientMetadata = async (patientId, tenantId, callerId) => {
  try {
    const dataByTenantID = await getDataFromTenant(tenantId);
    const {
      appIdFhirUrl,
      appIdFhirTenantId,
      appIdFhirHost,
      appIdFhirClientId: clientID,
      appIdFhirClientSecret: clientSecret,
    } = dataByTenantID;

    // construct Basic Auth token from client ID and secret
    const authCreds = `${clientID}:${clientSecret}`;
    const buf = Buffer.from(authCreds);
    const authCredToken = buf.toString('base64');

    // instantiate the AppIDLogin client

    const axiosClient = appIdLoginClient(authCredToken, {
      appIdFhirUrl,
      appIdFhirTenantId,
    });
    const requestBody = {
      grant_type: 'client_credentials',
      scope: 'openId',
    };

    logger.debug('Attempting to authenticate with Patient Support API');
    // authenticate with the AppID instance fronting the Patient Support API that accesses the FHIR instance.
    const authResponse = await axiosClient.post('/', qs.stringify(requestBody));
    const { status, data } = authResponse;
    const appIDToken = data.access_token; // this is the token need to access the Patient Support API

    if (status === 200) {
      const currentDate = new Date();
      const currentTimestamp = Math.round(currentDate.getTime() / 1000);

      // instantiate the Patient Support API client
      const fhirClient = fhirLoginClient(tenantId, appIDToken, authCredToken, appIdFhirHost);

      // execute the query against the Patient Support API to get the patient metadata
      logger.debug('Attempting to query Patient Support API');
      const response = await fhirClient.get(`${patientId}`);

      // refine the raw response into just what we need
      const filterPatientData = processPatientResponse(response.data);

      // IMPORTANT: log access to patient metadata from FHIR
      const nameFields = {
        prefix: filterPatientData.prefix,
        given: filterPatientData.given,
        family: filterPatientData.family,
      };
      // eslint-disable-next-line max-len
      logger.info(`Patient Information Accessed by Caller=${callerId} at Timestamp=${currentTimestamp}: ID=${patientId}, Name=${JSON.stringify(nameFields)}, Email=${filterPatientData.email}, and Patient.*`);

      return {
        status,
        message: `Found patient record found for ${patientId}`,
        payload: filterPatientData,
      };
    }
    return null;
  } catch (error) {
    const responseStatus = error.response && error.response.status;
    const responseData = error.response && error.response.data;

    let status = responseStatus || 400;
    if (status === 404) {
      status = 204; // No Content - don't treat this as an error
    }

    const errorMsg = 'Failed to retrieve patient metadata';
    if (responseData) {
      const responseDataStr = JSON.stringify(responseData);
      const patientNotFoundMsg = `Resource 'Patient/${patientId}' not found.`;

      if (responseDataStr.includes(patientNotFoundMsg)) {
        logger.warn(`${errorMsg}: ${responseDataStr}`);
      } else {
        logger.error(`${errorMsg}: ${responseDataStr}`);
      }
    } else if (error.message) {
      logger.error(`${errorMsg}: ${error.message}`);
    } else {
      logger.error(errorMsg);
    }

    return {
      status,
      payload: error.message || errorMsg,
    };
  }
};

module.exports = {
  getPatientMetadata,
};
