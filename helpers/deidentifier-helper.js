/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

/*
 * Util functions for interacting with the external De-Identifier Service API.
 * It de-identifies PHI/PII data and stores these data in HIPAA compliant storage.
 *
 * See: https://github.com/HCLS-Consent-Manager/de-identifier/
 */

const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');

const config = require('../config');
const constants = require('./constants');
const tlsHelper = require('./tls-helper');

const baseUrl = process.env.DEIDENTIFIER_URL;

const identifierBatchRoute = '/api/identifier/batch';
const deIdentifierRoute = '/api/de-identifier';
const searchDePiiRoute = '/api/de-identifier/search';

const logger = require('../config/logger').getLogger('deidentifier-helper');

logger.level = config.log.level;

const isUseHttps = process.env.USE_HTTPS === 'true';
const tlsFolder = process.env.TLS_FOLDER_PATH || './config/tls';
const serverCert = path.resolve(tlsFolder, 'tls.crt');
const serverKey = path.resolve(tlsFolder, 'tls.key');

/**
 * Get request config to De-Identifier service.
 *
 * @param {object} payload - payload
 * @returns {AxiosRequestConfig<Object>} axios request config
 */
const setAxiosOptions = (payload) => {
  const foundKeyFiles = tlsHelper.validateSSLFiles(serverKey, serverCert);
  if (isUseHttps && foundKeyFiles) {
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
      key: fs.readFileSync(serverKey),
      cert: fs.readFileSync(serverCert),
    });
    return { httpsAgent, ...payload };
  }
  return { ...payload };
};

/**
 * Send post request with axios.
 *
 * @param {string} url - URL
 * @param {object} data - data to send
 * @param {string} tenantID - tenantID to send
 * @returns {Promise<AxiosResponse<object>>} axios response.
 */
async function sendPostRequest(url, data, { tenantID, txID }) {
  logger.debug(`Sending POST request to de-identifier service, URL: ${url}`);
  try {
    const axiosOptions = setAxiosOptions({
      headers: {
        [constants.REQUEST_HEADERS.TENANT_ID]: tenantID,
        [constants.REQUEST_HEADERS.TRANSACTION_ID]: txID,
      },
    });
    return await axios.post(url, data, axiosOptions);
  } catch (err) {
    logger.trace(err);

    if (err.response) {
      if (err.response.status === 413) {
        // eslint-disable-next-line no-throw-literal
        throw err;
      }
      const responseData = err.response.data;
      // eslint-disable-next-line max-len
      throw new Error(`Request to de-identifier service failed, status: ${responseData.status}, message: ${responseData.message}`);
    }

    if (err.request) {
      throw new Error(`Failed to send request to de-identifier service: ${err.message}`);
    }

    throw err;
  }
}

/**
 * De-identify PII/PHI.
 * If de-identification is disabled
 * then returns PII without de-identification.
 *
 * @param {string} pii - PII/PHI
 * @param {string} tenantID - tenantID
 * @returns {string} De-PII/PHI key if de-identification is enabled otherwise PII/PHI
 */
module.exports.deIdentifyPii = async (pii, tenantID, txID) => {
  logger.debug('Attempting to de-identify PII');

  try {
    const url = baseUrl + deIdentifierRoute;
    const response = await sendPostRequest(url, { pii }, { tenantID, txID });
    logger.debug('De-identification successful');
    return response.data.dePii;
  } catch (err) {
    logger.error(`Failed to de-identify PII: ${err.message}`);
    throw err;
  }
};

/**
 * Search for existing de-identified PII record on De-Identifier service.
 * If record does not exist return null.
 *
 * @param {string} pii - PII/PHI data
 * @param {string} tenantID - tenantID
 * @returns {Promise<string>} de-identified PII record if it exists otherwise null
 */
module.exports.getDeIdentifiedPii = async (pii, tenantID, txID) => {
  logger.debug('Searching for de-identified PII');

  try {
    const url = baseUrl + searchDePiiRoute;
    const response = await sendPostRequest(url, { pii }, { tenantID, txID });
    return response.data.dePii;
  } catch (err) {
    logger.error('Failed to get de-identified PII:', err.message);
    throw err;
  }
};

/**
 * Identify PII/PHI by De-PII key.
 * If de-identification is disabled then returns same value
 * that was passed as dePii argument.
 *
 * @param {string} callerID - callerID
 * @param {string} dePii - de-identified PII/PHI key
 * @param {string} tenantID - tenantID
 * @returns {array} consents
 */
module.exports.getPii = async (callerID, dataToIdentifyBatch, tenantID, txID) => {
  logger.debug('Attempting to identify PII from De-PII');

  const currentDate = new Date();
  const currentTimestamp = Math.round(currentDate.getTime() / 1000);

  // eslint-disable-next-line no-restricted-syntax
  for (const consent of dataToIdentifyBatch) {
    const msg = `ConsentID=${consent.ConsentID}, PatientID=${consent.PatientID}, ServiceID=${consent.ServiceID}`;
    logger.info(`Accessed PII/PHI from De-Identified PII/PHI: ${msg}, Caller: ${callerID}, Timestamp: ${currentTimestamp}`);
  }

  try {
    const url = baseUrl + identifierBatchRoute;
    const fieldsToIdentify = ['PatientID', 'ServiceID'];
    const response = await sendPostRequest(url, { dataToIdentifyBatch, fieldsToIdentify }, { tenantID, txID });
    return response.data.identifiedDataBatch;
  } catch (err) {
    logger.error('Failed to identify PII:', err.message);
    throw err;
  }
};

/**
 * Function returns readiness status for De-Identifier before
 * app startup.
 *
 * @returns {Promise<AxiosResponse<object>>} readiness status for De-Identifier service
 */
module.exports.checkDeIdentifierEndpoint = async () => {
  logger.debug('Sending readiness request to De-Identifier');
  const url = `${baseUrl}/ready`;

  try {
    const axiosOptions = setAxiosOptions();
    await axios.get(url, axiosOptions);

    logger.info('De-Identifier readiness is OK');
  } catch (err) {
    const errResponseMsg = err.response ? err.response.data.msg : err.message;
    logger.error(`De-Identifier readiness is not OK: ${errResponseMsg}`);
    throw err;
  }
};
