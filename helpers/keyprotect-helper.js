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
const moment = require('moment');

const cloudIamHelper = require('./cloud-iam-helper');
const config = require('../config');
const logger = require('../config/logger').getLogger('keyprotect-helper');

const url = process.env.KEYPROTECT_URL;
const instanceID = process.env.KEYPROTECT_GUID;
const apikey = process.env.KEYPROTECT_SERVICE_API_KEY;

// validate that KeyProtect env variables are set
const validateConfig = () => {
  let missingVar;
  if (!url) {
    missingVar = 'KEYPROTECT_URL';
  } else if (!instanceID) {
    missingVar = 'KEYPROTECT_GUID';
  }

  if (missingVar) {
    throw new Error(`Invalid KeyProtect config: missing variable '${missingVar}'`);
  }
};

const pingKeyProtect = async () => {
  const { CancelToken } = axios;
  const source = CancelToken.source();
  const timeout = setTimeout(() => {
    source.cancel(`Request timed out after ${config.keyProtect.timeout} ms`);
  }, config.keyProtect.timeout);
  const token = await cloudIamHelper.getCloudIAMToken(apikey);

  const pingClient = axios.create({
    baseURL: url,
    timeout: config.keyProtect.timeout,
    headers: {
      Accept: 'application/vnd.ibm.kms.key+json',
      Authorization: `Bearer ${token}`,
      'bluemix-instance': instanceID,
    },
  });

  try {
    await pingClient.get('', { cancelToken: source.token }).finally(() => clearTimeout(timeout));
    logger.info('KeyProtect health is OK');
    return true;
  } catch (error) {
    logger.error(`KeyProtect health is not OK: ${error}`);
    return error;
  }
};

const keyProtectClient = (token) => {
  const client = axios.create({
    baseURL: url,
    timeout: config.keyProtect.timeout,
    headers: {
      Accept: 'application/vnd.ibm.kms.key+json',
      Authorization: `Bearer ${token}`,
      'bluemix-instance': instanceID,
    },
  });

  const retries = config.keyProtect.retries || 1;
  const retryDelay = config.keyProtect.retryDelay || 3000;

  // setup retry-axios config
  client.defaults.raxConfig = {
    instance: client,
    retry: retries,
    noResponseRetries: retries, // retry when no response received (such as on ETIMEOUT)
    statusCodesToRetry: [[500, 599]], // retry only on 5xx responses
    retryDelay,
    onRetryAttempt: (err) => {
      const cfg = rax.getConfig(err);
      logger.warn('No response received from KeyProtect, retrying request:');
      logger.warn(`Retry attempt #${cfg.currentRetryAttempt}`);
    },
  };

  rax.attach(client);
  return client;
};

// eslint-disable-next-line complexity
const getKeysByName = async (client, keyName) => {
  try {
    validateConfig();

    const response = await client.get();

    const filteredKeys = response.data.resources
      .filter((key) => key.name === keyName);
    logger.info(`Successfully retrieved ${filteredKeys.length} key id(s) for name = ${keyName} from KeyProtect`);
    return filteredKeys;
  } catch (error) {
    let failureReasons = '';
    if (error.response && error.response.data && error.response.data.resources) {
      failureReasons = JSON.stringify(error.response.data.resources);
    } else if (error.message) {
      failureReasons = error.message;
    }

    const errMsg = `Failed to retrieve key ids for ${keyName} from KeyProtect: ${failureReasons}`;
    logger.warn(errMsg);
    return [];
  }
};

// eslint-disable-next-line complexity
const deleteKey = async (keyID) => {
  try {
    validateConfig();

    const token = await cloudIamHelper.getCloudIAMToken(apikey);
    const client = keyProtectClient(token);

    await client.delete(keyID);

    logger.info(`Successfully deleted key ${keyID} in KeyProtect`);
  } catch (error) {
    let failureReasons = '';
    if (error.response && error.response.data && error.response.data.resources) {
      failureReasons = JSON.stringify(error.response.data.resources);
    } else if (error.message) {
      failureReasons = error.message;
    }

    const errMsg = `Failed to delete key ${keyID} in KeyProtect: ${failureReasons}`;
    logger.error(errMsg);
    throw new Error(errMsg);
  }
};

const getNewestKeyIDByName = async (client, searchName) => {
  const keyList = await getKeysByName(client, searchName);

  let newestKeyID = '';
  let newestCreationDate = moment(0);

  for (let i = 0; i < keyList.length; i += 1) {
    if (keyList[i].name === searchName) {
      const currentCreationDate = moment(keyList[i].creationDate);
      // check creation date against newest key with same name
      if (newestCreationDate.isBefore(currentCreationDate)) {
        newestCreationDate = currentCreationDate;

        // delete older key with same name
        if (newestKeyID) {
          logger.warn(`Attempting to delete older key ${newestKeyID} with name ${searchName} in KeyProtect`);
          // eslint-disable-next-line no-await-in-loop
          await deleteKey(newestKeyID);
        }

        newestKeyID = keyList[i].id;
      }
    }
  }
  return newestKeyID;
};

// eslint-disable-next-line complexity
const parseKeyPayload = (response) => {
  try {
    const payloadExists = response.data
            && response.data.resources
            && response.data.resources.length
            && response.data.resources[0].payload;

    if (payloadExists) {
      const { payload } = response.data.resources[0];
      const decodedPayload = Buffer.from(payload, 'base64').toString();
      const jsonPayload = JSON.parse(decodedPayload);
      logger.debug('Successfully parsed key from KeyProtect');
      return jsonPayload;
    }
    logger.warn('Payload not found for key from KeyProtect');
  } catch (error) {
    logger.warn(`Failed to parse key from KeyProtect: ${error}`);
  }
  return '';
};

// eslint-disable-next-line complexity
const parseKeyID = (response) => {
  try {
    const idExists = response.data
            && response.data.resources
            && response.data.resources.length
            && response.data.resources[0].id;

    if (idExists) {
      return response.data.resources[0].id;
    }
    logger.warn('ID not found for key from KeyProtect');
  } catch (error) {
    logger.warn(`Failed to parse ID for key from KeyProtect: ${error}`);
  }
  return '';
};

// eslint-disable-next-line complexity
const getKeyByID = async (keyID) => {
  try {
    validateConfig();

    const token = await cloudIamHelper.getCloudIAMToken(apikey);
    const client = keyProtectClient(token);

    const getKeyResponse = await client.get(keyID);

    logger.info(`Successfully retrieved key ${keyID} from KeyProtect`);
    return parseKeyPayload(getKeyResponse);
  } catch (error) {
    let failureReasons = '';
    if (error.response && error.response.data && error.response.data.resources) {
      failureReasons = JSON.stringify(error.response.data.resources);
    } else if (error.message) {
      failureReasons = error.message;
    }

    const errMsg = `Failed to retrieve key ${keyID} from KeyProtect: ${failureReasons}`;
    logger.warn(errMsg);
    return '';
  }
};

// eslint-disable-next-line complexity
const getNewestKeyByName = async (keyName) => {
  try {
    validateConfig();

    const token = await cloudIamHelper.getCloudIAMToken(apikey);
    const client = keyProtectClient(token);

    const keyID = await getNewestKeyIDByName(client, keyName);
    if (!keyID) {
      const errMsg = `Key ${keyName} not found in KeyProtect`;
      logger.warn(errMsg);
      return '';
    }

    const getKeyResponse = await client.get(keyID);

    logger.info(`Successfully retrieved newest key for name = ${keyName} from KeyProtect (id = ${keyID})`);
    return parseKeyPayload(getKeyResponse);
  } catch (error) {
    let failureReasons = '';
    if (error.response && error.response.data && error.response.data.resources) {
      failureReasons = JSON.stringify(error.response.data.resources);
    } else if (error.message) {
      failureReasons = error.message;
    }

    const errMsg = `Failed to retrieve key ${keyName} from KeyProtect: ${failureReasons}`;
    logger.warn(errMsg);
    return '';
  }
};

// eslint-disable-next-line complexity
const createKey = async (keyName, keyPayload) => {
  try {
    validateConfig();

    if (!keyName) throw new Error('keyName is empty');
    if (!keyPayload) throw new Error('keyPayload is empty');

    logger.debug('Attempting to check for existing key (before creating new key)');
    const token = await cloudIamHelper.getCloudIAMToken(apikey);
    const client = keyProtectClient(token);

    const existingKeyID = await getNewestKeyIDByName(client, keyName);
    if (existingKeyID) {
      logger.debug('Existing key found, attempting to delete (before creating new key)');
      await deleteKey(existingKeyID);
    }

    const strPayload = JSON.stringify(keyPayload);
    const encodedPayload = Buffer.from(strPayload).toString('base64');

    const requestBody = {
      metadata: {
        collectionType: 'application/vnd.ibm.kms.key+json',
        collectionTotal: 1,
      },
      resources: [
        {
          type: 'application/vnd.ibm.kms.key+json',
          name: keyName,
          description: 'Simple Consent Blockchain Admin Identity',
          extractable: true,
          payload: encodedPayload,
        },
      ],
    };

    const createResponse = await client.post('', JSON.stringify(requestBody));

    const keyID = parseKeyID(createResponse);
    logger.info(`Successfully created key ${keyID} in KeyProtect`);
    return keyID;
  } catch (error) {
    let failureReasons = '';
    if (error.response && error.response.data && error.response.data.resources) {
      failureReasons = JSON.stringify(error.response.data.resources);
    } else if (error.message) {
      failureReasons = error.message;
    }

    const errMsg = `Failed to create key in KeyProtect: ${failureReasons}`;
    logger.error(errMsg);
    throw new Error(errMsg);
  }
};

module.exports = {
  createKey,
  getKeyByID,
  getNewestKeyByName,
  deleteKey,
  pingKeyProtect,
};
