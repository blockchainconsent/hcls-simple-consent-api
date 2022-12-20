/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

/* eslint-disable no-param-reassign */

const config = require('../config');
const constants = require('../helpers/constants');
const appIDHelper = require('../helpers/app-id-helper');
const consentHelper = require('../helpers/consent-helper');
const fhirHelper = require('../helpers/fhir-id-helper');
const logger = require('../config/logger').getLogger('consent-controller');

const { deIdentifyPii } = require('../helpers/deidentifier-helper');

const deidentifyConsent = async (consent, tenantID, txID) => {
  consent.PatientID = await deIdentifyPii(consent.PatientID, tenantID, txID);
  // ServiceID is an optional field
  if (consent.ServiceID) {
    consent.ServiceID = await deIdentifyPii(consent.ServiceID, tenantID, txID);
  }
  return consent;
};

exports.pingConsent = async (_req, res) => {
  logger.debug('Ping');
  const pingRes = await consentHelper.pingBlockchain();

  if (pingRes instanceof Error) {
    return res.status(500).json({
      msg: pingRes.message,
      status: 500,
    });
  }
  return res.status(200).json({
    msg: `GET /ping was successful: ${pingRes}`,
    status: 200,
  });
};

// eslint-disable-next-line complexity
exports.createConsent = async (req, res) => {
  const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
  logger.info(`POST /register-consent: ${JSON.stringify(req.body)}, txID: ${txID}`);

  const originalConsentData = req.body;
  let consentData = {};

  try {
    consentData = consentHelper.populateConsent(req.body, txID);
  } catch (error) {
    logger.error(`Request body validation failed: ${error.message}, txID: ${txID}`);
    return res.status(400).json({
      msg: error.message,
      successes: [],
      failures: [],
      status: 400,
      failure_type: 'Consent',
    });
  }

  try {
    const isDevMode = config.devMode;
    if (!isDevMode) {
      consentData = await deidentifyConsent(consentData, req.body.TenantID, txID);
    }
  } catch (error) {
    logger.error(`De-identification failed: ${error.message}, txID: ${txID}`);
    return res.status(500).json({
      msg: error.message,
      successes: [],
      failures: [originalConsentData],
      status: 500,
      failure_type: 'Consent',
    });
  }

  try {
    logger.debug(`Attempting to write consent to ledger, txID: ${txID}`);
    await consentHelper.writeToBC(consentData);
  } catch (error) {
    // check the existence of the consent
    // if consent was created that return error with status 409
    if (error.message.includes('already exists')) {
      const msg = `Consent ${txID} already exists, txID: ${txID}`;
      logger.warn(error.message);
      return res.status(200).json({
        msg,
        successes: [originalConsentData],
        failures: [],
        status: 200,
        failure_type: '',
      });
    }

    logger.error(`Write to blockchain failed: ${error.message}, txID: ${txID}`);
    return res.status(500).json({
      msg: error.message,
      successes: [],
      failures: [originalConsentData],
      status: 500,
      failure_type: 'Consent',
    });
  }

  logger.info(`POST /register-consent was successful, txID: ${txID}`);
  return res.status(200).json({
    msg: 'POST /register-consent was successful',
    successes: [originalConsentData],
    failures: [],
    status: 200,
    failure_type: '',
  });
};

// eslint-disable-next-line complexity
exports.queryConsentsByPatientID = async (req, res) => {
  logger.info('Query Consents by PatientID');

  const result = {
    consents: [],
    bookmark: '',
  };

  const txID = req.headers[constants.REQUEST_HEADERS.TRANSACTION_ID];
  const token = req.headers.authorization;

  const { pageSize, bookmark = '' } = req.query;
  const { PAGE_SIZE } = constants.QUERY_PARAMS;
  const queryParams = {
    pageSize: pageSize && pageSize > 0 && pageSize <= PAGE_SIZE ? pageSize : PAGE_SIZE,
    bookmark,
  };

  let callerID = '';
  try {
    callerID = await appIDHelper.getAppIDUserSub(req, token);
  } catch (error) {
    return res.status(500).json({
      msg: error.message,
      status: 500,
    });
  }

  let patientID = req.headers[constants.REQUEST_HEADERS.PATIENT_ID];
  if (!patientID) {
    const errMsg = 'Missing PatientID header parameter';
    logger.error(errMsg);
    return res.status(400).json({
      msg: errMsg,
      status: 400,
    });
  }

  const tenantID = req.TenantID;
  if (!tenantID) {
    const errMsg = 'Missing TenantID';
    logger.error(errMsg);
    return res.status(400).json({
      msg: errMsg,
      status: 400,
    });
  }

  // de-identify patientID query parameter
  try {
    const isDevMode = config.devMode;
    if (!isDevMode) {
      patientID = await deIdentifyPii(patientID, req.TenantID, txID);
    }
  } catch (error) {
    return res.status(500).json({
      msg: error.message,
      status: 500,
    });
  }

  try {
    logger.debug('Attempting to query consents by PatientID and TenantID from ledger');
    const responseFromBC = await consentHelper.queryFromBC(patientID, tenantID, queryParams);
    result.consents = responseFromBC.records;
    result.bookmark = responseFromBC.bookmark;
  } catch (error) {
    return res.status(500).json({
      msg: error.message,
      status: 500,
    });
  }

  try {
    const isDevMode = config.devMode;
    if (!isDevMode && Array.isArray(result.consents) && result.consents.length) {
      result.consents = await consentHelper.prepareToReidentifyConsents(result.consents, callerID, tenantID, txID);
      if (!result.consents) {
        return res.status(404).json({
          msg: 'Not found',
          status: 404,
        });
      }
    }
  } catch (error) {
    return res.status(500).json({
      msg: error.message,
      status: 500,
    });
  }

  return res.status(200).json({
    msg: 'GET /consent was successful',
    status: 200,
    payload: result.consents,
    bookmark: result.bookmark,
  });
};

// eslint-disable-next-line complexity
exports.queryPatientData = async (req, res) => {
  logger.info('Query Patient Data');

  try {
    const patientID = req.headers[constants.REQUEST_HEADERS.PATIENT_ID];
    if (!patientID) {
      const errMsg = 'Missing PatientID header parameter';
      logger.error(errMsg);
      return res.status(400).json({ msg: errMsg, status: 400 });
    }

    const tenantID = req.TenantID;
    if (!tenantID) {
      const errMsg = 'Missing TenantID';
      logger.error(errMsg);
      return res.status(400).json({
        msg: errMsg,
        status: 400,
      });
    }

    const token = req.headers.authorization;

    let callerID = '';
    try {
      callerID = await appIDHelper.getAppIDUserSub(req, token);
    } catch (error) {
      return res.status(500).json({
        msg: error.message,
        status: 500,
      });
    }

    const { status, payload } = await fhirHelper.getPatientMetadata(patientID, tenantID, callerID);

    if (status === 200) {
      res.status(200).json({ msg: 'GET /patient was successful', status: 200, payload });
    } else {
      res.status(status).json({ msg: payload, status });
    }

    return null; // quiets the linter error
  } catch (error) {
    return res.status(500).json({ msg: error.message, status: 500 });
  }
};
