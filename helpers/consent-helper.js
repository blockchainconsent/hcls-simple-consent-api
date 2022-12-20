/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const bcHelper = require('./blockchain-helper');
const bcUtils = require('./blockchain-utils');
const config = require('../config/config.json');
const { getPii } = require('./deidentifier-helper');
const logger = require('../config/logger').getLogger('consent-helper');

const testFactory = {};
const validConsentOptions =  ['write','read','deny'];

// populateConsent validates input and returns consent data.
// eslint-disable-next-line complexity
function populateConsent(input, txID) {
  logger.debug('Validate request parameters and return consent data');

  const {
    PatientID,
    ServiceID,
    TenantID,
    DatatypeIDs,
    ConsentOption,
    Creation,
    Expiration = 0,
    FHIRResourceID,
    FHIRResourceVersion,
    FHIRPolicy,
    FHIRStatus,
    FHIRProvisionType,
    FHIRProvisionAction,
    FHIRPerformerIDSystem,
    FHIRPerformerIDValue,
    FHIRPerformerDisplay,
    FHIRRecipientIDSystem,
    FHIRRecipientIDValue,
    FHIRRecipientDisplay,
  } = input;

  if (
    !PatientID
        || !TenantID
        || !DatatypeIDs
        || !Creation
  ) {
    const errMsg = 'Missing required field(s)';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (!Array.isArray(DatatypeIDs)) {
    const errMsg = 'DatatypeIDs must be array';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (DatatypeIDs.length < 1) {
    const errMsg = 'DatatypeIDs must not be empty';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (ConsentOption && !Array.isArray(ConsentOption)) {
    const errMsg = 'ConsentOption must be array';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (ConsentOption && ConsentOption.length > 2) {
    const errMsg = 'Too many consent options';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if(ConsentOption && !(ConsentOption.every(elem => validConsentOptions.indexOf(elem) > -1))) {
    const errMsg = 'invalid consent option';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (
    ConsentOption && ((ConsentOption.includes('write') && ConsentOption.includes('deny'))
        || (ConsentOption.includes('read') && ConsentOption.includes('deny')))
  ) {
    const errMsg = 'deny cannot be paired with another consent option';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (Creation && !(new Date(Creation).getTime() > 0)) {
    const errMsg = 'Creation has invalid unix timestamp';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (Expiration && !(new Date(Expiration).getTime() >= 0)) {
    const errMsg = 'Invalid Expiration';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (FHIRResourceID && typeof FHIRResourceID !== 'string') {
    const errMsg = 'FHIRResourceID must be string';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (typeof FHIRResourceID === 'string' && FHIRResourceID.length < 1) {
    const errMsg = 'FHIRResourceID must not be empty';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (FHIRResourceVersion && typeof FHIRResourceVersion !== 'string') {
    const errMsg = 'FHIRResourceVersion must be string';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (typeof FHIRResourceVersion === 'string' && FHIRResourceVersion.length < 1) {
    const errMsg = 'FHIRResourceVersion must not be empty';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (FHIRPolicy && typeof FHIRPolicy !== 'string') {
    const errMsg = 'FHIRPolicy must be string';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (typeof FHIRPolicy === 'string' && FHIRPolicy.length < 1) {
    const errMsg = 'FHIRPolicy must not be empty';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (FHIRStatus && typeof FHIRStatus !== 'string') {
    const errMsg = 'FHIRStatus must be string';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (typeof FHIRStatus === 'string' && FHIRStatus.length < 1) {
    const errMsg = 'FHIRStatus must not be empty';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (FHIRProvisionType && typeof FHIRProvisionType !== 'string') {
    const errMsg = 'FHIRProvisionType must be string';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (typeof FHIRProvisionType === 'string' && FHIRProvisionType.length < 1) {
    const errMsg = 'FHIRProvisionType must not be empty';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (FHIRProvisionAction && typeof FHIRProvisionAction !== 'string') {
    const errMsg = 'FHIRProvisionAction must be string';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (typeof FHIRProvisionAction === 'string' && FHIRProvisionAction.length < 1) {
    const errMsg = 'FHIRProvisionAction must not be empty';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (!(FHIRStatus && FHIRProvisionType && FHIRProvisionAction) && (!ConsentOption || !ConsentOption.length)) {
    const errMsg = 'Must specify at least one consent option';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (FHIRPerformerIDSystem && typeof FHIRPerformerIDSystem !== 'string') {
    const errMsg = 'FHIRPerformerIDSystem must be string';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (typeof FHIRPerformerIDSystem === 'string' && FHIRPerformerIDSystem.length < 1) {
    const errMsg = 'FHIRPerformerIDSystem must not be empty';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (FHIRPerformerIDValue && typeof FHIRPerformerIDValue !== 'string') {
    const errMsg = 'FHIRPerformerIDValue must be string';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (typeof FHIRPerformerIDValue === 'string' && FHIRPerformerIDValue.length < 1) {
    const errMsg = 'FHIRPerformerIDValue must not be empty';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (FHIRPerformerDisplay && typeof FHIRPerformerDisplay !== 'string') {
    const errMsg = 'FHIRPerformerDisplay must be string';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (typeof FHIRPerformerDisplay === 'string' && FHIRPerformerDisplay.length < 1) {
    const errMsg = 'FHIRPerformerDisplay must not be empty';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (FHIRRecipientIDSystem && typeof FHIRRecipientIDSystem !== 'string') {
    const errMsg = 'FHIRRecipientIDSystem must be string';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (typeof FHIRRecipientIDSystem === 'string' && FHIRRecipientIDSystem.length < 1) {
    const errMsg = 'FHIRRecipientIDSystem must not be empty';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (FHIRRecipientIDValue && typeof FHIRRecipientIDValue !== 'string') {
    const errMsg = 'FHIRRecipientIDValue must be string';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (typeof FHIRRecipientIDValue === 'string' && FHIRRecipientIDValue.length < 1) {
    const errMsg = 'FHIRRecipientIDValue must not be empty';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (FHIRRecipientDisplay && typeof FHIRRecipientDisplay !== 'string') {
    const errMsg = 'FHIRRecipientDisplay must be string';
    logger.error(errMsg);
    throw new Error(errMsg);
  } else if (typeof FHIRRecipientDisplay === 'string' && FHIRRecipientDisplay.length < 1) {
    const errMsg = 'FHIRRecipientDisplay must not be empty';
    logger.error(errMsg);
    throw new Error(errMsg);
  }

  const expirationTimestamp = Expiration || 0;
  const expiration = `${expirationTimestamp}`;
  const creation = `${Creation}`;

  return {
    ConsentID: txID,
    PatientID,
    ServiceID,
    TenantID,
    DatatypeIDs: JSON.stringify(DatatypeIDs),
    ConsentOption: JSON.stringify(ConsentOption) || JSON.stringify(['']),
    Creation: creation,
    Expiration: expiration,
    FHIRResourceID: FHIRResourceID || '',
    FHIRResourceVersion: FHIRResourceVersion || '',
    FHIRPolicy: FHIRPolicy || '',
    FHIRStatus: FHIRStatus || '',
    FHIRProvisionType: FHIRProvisionType || '',
    FHIRProvisionAction: FHIRProvisionAction || '',
    FHIRPerformerIDSystem: FHIRPerformerIDSystem || '',
    FHIRPerformerIDValue: FHIRPerformerIDValue || '',
    FHIRPerformerDisplay: FHIRPerformerDisplay || '',
    FHIRRecipientIDSystem: FHIRRecipientIDSystem || '',
    FHIRRecipientIDValue: FHIRRecipientIDValue || '',
    FHIRRecipientDisplay: FHIRRecipientDisplay || '',
  };
}

// pingBlockchain pings the ledger.
const pingBlockchain = async () => {
  logger.debug('pingBlockchain');

  const chaincodeID = bcUtils.getChaincodeName();
  const chainID = bcUtils.getChannelName();
  const userID = bcUtils.getAdminID();
  const args = ['Ping'];

  const bcArgs = {
    chaincodeID,
    chainID,
    userID,
    args,
  };

  const timeout = (promise, time, exception) => {
    let timer;
    return Promise.race([promise, new Promise((_res, rej) => {
      timer = setTimeout(rej, time, exception);
    })])
      .finally(() => clearTimeout(timer));
  };
  const timeoutError = new Error(`Request timed out after ${config.blockchain.pingTimeout} ms`);

  try {
    return await timeout(bcHelper.queryLedger(bcArgs), config.blockchain.pingTimeout, timeoutError);
  } catch (error) {
    const errMsg = `Failed to pingBlockchain: ${error.message}`;
    logger.error(errMsg);
    throw new Error(errMsg);
  }
};

const writeToBC = async (inputConsent) => {
  logger.debug('writeToBC');
  try {
    const chaincodeID = bcUtils.getChaincodeName();
    const chainID = bcUtils.getChannelName();
    const userID = bcUtils.getAdminID();

    const args = ['CreateConsent'];
    Object.keys(inputConsent).forEach((key) => {
      const arg = inputConsent[key] || '';
      args.push(arg);
    });

    const bcArgs = {
      chaincodeID,
      chainID,
      userID,
      args,
    };
    await bcHelper.invokeLedger(bcArgs);
  } catch (error) {
    const errMsg = `Failed to writeToBC: ${error.message}`;
    logger.error(errMsg);
    throw new Error(errMsg);
  }
};

// queryFromBC queries consents by "PatientID" from the ledger.
const queryFromBC = async (patientID, tenantID, queryParams) => {
  logger.debug('queryFromBC');

  try {
    if (!queryParams) {
      const errMsg = 'Missing required field(s)';
      logger.error(errMsg);
      return new Error(errMsg);
    }

    const chaincodeID = bcUtils.getChaincodeName();
    const chainID = bcUtils.getChannelName();
    const userID = bcUtils.getAdminID();
    const { pageSize, bookmark } = queryParams;
    const args = ['QueryConsentWithPagination', patientID, tenantID, pageSize, bookmark];

    const bcArgs = {
      chaincodeID,
      chainID,
      userID,
      args,
    };
    const queryRes = await bcHelper.queryLedger(bcArgs);
    if (queryRes) {
      return JSON.parse(queryRes);
    }
    return { records: [], bookmark: '' };
  } catch (error) {
    const errMsg = `Failed to queryFromBC: ${error.message}`;
    logger.error(errMsg);
    throw new Error(errMsg);
  }
};

testFactory.reidentifyConsents = async (callerID, deidConsents, tenantID, txID) => {
  const consentsWithPii = await getPii(callerID, deidConsents, tenantID, txID);
  return consentsWithPii;
};

testFactory.makeChunks = (array) => {
  const chunkSize = Math.ceil(array.length / 2);
  const data = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    data.push(chunk);
  }
  return data;
};

const prepareToReidentifyConsents = async (consents, callerID, tenantID, txID) => {
  // re-identify PII consent fields
  let chunks = [];
  const data = [];
  let index = 0; // failed chunk index
  // eslint-disable-next-line consistent-return
  const reidentifyConsentsProcess = async () => {
    try {
      if (chunks.length) {
        index = 0; // reset failed chunk index before process
        // eslint-disable-next-line no-restricted-syntax
        for (const chunk of chunks) {
          // eslint-disable-next-line no-await-in-loop
          const result = await testFactory.reidentifyConsents(callerID, chunk, tenantID, txID);
          data.push(...result); // filled data with succeeded result
          index += 1; // increase chunk index if succeeded process result
        }
      } else {
        const result = await testFactory.reidentifyConsents(callerID, consents, tenantID, txID);
        data.push(...result);
      }
    } catch (error) {
      if (error.response && error.response.status === 413) {
        if (!chunks.length) {
          // create chunks on first error
          chunks = testFactory.makeChunks(consents);
        } else {
          // create chunks based on failed index
          const chunksToReplace = testFactory.makeChunks(chunks[index]);
          // replace all succeeded chunks with failed ones
          chunks.splice(0, index + 1, ...chunksToReplace);
        }
        return reidentifyConsentsProcess();
      }
      throw error;
    }
  };

  await reidentifyConsentsProcess();

  return data;
};

testFactory.prepareToReidentifyConsents = prepareToReidentifyConsents;

module.exports = {
  pingBlockchain,
  populateConsent,
  writeToBC,
  queryFromBC,
  prepareToReidentifyConsents,
  testFactory,
};
