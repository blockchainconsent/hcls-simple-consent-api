/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const { Wallets, Gateway } = require('fabric-network');

const FabricCAServices = require('fabric-ca-client');

const config = require('../config');
const utils = require('./blockchain-utils');

const kpHelper = require('./keyprotect-helper');
const logger = require('../config/logger').getLogger('blockchain-helper');

const { adminKeyName } = config.keyProtect;

const gatewayHelper = {};

const getWalletFromAdminKey = async (id, identityKey) => {
  logger.debug('getWalletFromAdminKey()');
  const wallet = await Wallets.newInMemoryWallet();
  const x509Identity = {
    credentials: {
      certificate: identityKey.public,
      privateKey: identityKey.private_key,
    },
    mspId: utils.getMSP(),
    type: 'X.509',
  };

  await wallet.put(id, x509Identity);
  return wallet;
};

const enrollAdminToCA = async () => {
  logger.debug('enrollAdminToCA()');
  const adminID = utils.getAdminID();
  logger.debug(`Attempting to enroll ${adminID} to CA`);
  const ca = new FabricCAServices(utils.getCAUrl());
  const enrollment = await ca.enroll({
    enrollmentID: adminID,
    enrollmentSecret: utils.getAdminSecret(),
  });
  return enrollment;
};

// get admin key from KeyProtect or CA
const getAdminKey = async (skipKeyProtect) => {
  logger.debug('getAdminKey()');
  const adminID = utils.getAdminID();
  let adminKey = {};

  try {
    if (!skipKeyProtect) {
      adminKey = await kpHelper.getNewestKeyByName(adminKeyName);
      if (adminKey) {
        logger.info(`Key for blockchain user '${adminID}' already exists in KeyProtect, skipping CA enroll`);
        return adminKey;
      }
    }

    // if no key retrieved from KeyProtect, enroll admin to CA
    const enrollment = await testFactory.enrollAdminToCA();

    adminKey = {
      public: enrollment.certificate,
      private_key: enrollment.key.toBytes(),
    };
    logger.info(`Successfully enrolled admin user ${adminID}`);
  } catch (error) {
    logger.error(`Error enrolling admin user: ${error.message}`);
    throw error;
  }

  try {
    logger.debug(`Attempting to create key ${adminKeyName} in KeyProtect`);
    await kpHelper.createKey(adminKeyName, adminKey);
    return adminKey;
  } catch (error) {
    logger.error(`Error creating admin user key: ${error.message}`);
    throw error;
  }
};

const getAdminWallet = async (skipKeyProtect) => {
  logger.debug(`getAdminWallet(), skip checking KeyProtect: ${skipKeyProtect === true}`);
  try {
    const adminID = utils.getAdminID();
    const adminKey = await testFactory.getAdminKey(skipKeyProtect);
    return await testFactory.getWalletFromAdminKey(adminID, adminKey);
  } catch (error) {
    logger.error(`Error getting admin user wallet: ${error.message}`);
    throw error;
  }
};

// get admin key, populate wallet, and connect gateway
const tryConnectGateway = async (skipKeyProtect) => {
  const channelName = utils.getChannelName();
  const chaincodeName = utils.getChaincodeName();
  const identity = utils.getAdminID();
  const discovery = utils.getDiscovery();
  const connectionProfile = utils.getConnProfile();

  const wallet = await testFactory.getAdminWallet(skipKeyProtect);

  const connectionOptions = {
    identity,
    wallet,
    discovery,
    eventHandlerOptions: {
      commitTimeout: 30,
      endorseTimeout: 30,
    },
  };

  const gateway = new Gateway();
  await gateway.connect(connectionProfile, connectionOptions);

  const network = await gateway.getNetwork(channelName);
  const contract = network.getContract(chaincodeName);

  gatewayHelper.gateway = gateway;
  gatewayHelper.network = network;
  gatewayHelper.contract = contract;
};

// initialize gateway
const initializeGateway = async () => {
  logger.debug('initializeGateway()');

  try {
    await testFactory.tryConnectGateway();
  } catch (error) {
    let errMsg = `Failed to initialize gateway: ${error.message}`;
    logger.error(errMsg);

    if (error.message.includes('access denied')) {
      logger.debug('Attempting to disconnect gateway');
      if (gatewayHelper.gateway) {
        await gatewayHelper.gateway.disconnect();
      }

      logger.warn('Attempting to re-enroll admin user and connect gateway');
      try {
        await testFactory.tryConnectGateway(true);
      // eslint-disable-next-line no-shadow
      } catch (error) {
        errMsg = `Error re-enrolling admin user: ${error}`;
        logger.error(errMsg);
        throw new Error(errMsg);
      }
    } else {
      throw new Error(errMsg);
    }
  }
};

const queryLedger = async (body) => {
  try {
    const issueResponse = await gatewayHelper.contract.evaluateTransaction(...body.args);
    return issueResponse && issueResponse.length ? issueResponse.toString() : '';
  } catch (error) {
    let errMsg = `Error querying ledger: ${error.message}`;
    logger.error(errMsg);

    if (error.message.includes('access denied')) {
      logger.debug('Attempting to disconnect gateway');
      if (gatewayHelper.gateway) await gatewayHelper.gateway.disconnect();

      logger.warn('Attempting to re-enroll admin user and connect gateway');
      try {
        await testFactory.tryConnectGateway(true);

        logger.warn('Attempting to retry evaluate transaction');
        const issueResponse = await gatewayHelper.contract.evaluateTransaction(...body.args);
        return issueResponse && issueResponse.length ? issueResponse.toString() : '';
      // eslint-disable-next-line no-shadow
      } catch (error) {
        errMsg = `Error re-enrolling admin user: ${error}`;
        logger.error(errMsg);
        throw new Error(errMsg);
      }
    } else {
      throw new Error(errMsg);
    }
  }
};

const invokeLedger = async (body) => {
  try {
    await gatewayHelper.contract.submitTransaction(...body.args);
  } catch (error) {
    const errMsg = `Error invoking ledger: ${error}`;
    logger.error(errMsg);
    throw new Error(errMsg);
  }
};

const testFactory = {
  getWalletFromAdminKey,
  enrollAdminToCA,
  getAdminKey,
  getAdminWallet,
  tryConnectGateway,
};

module.exports = {
  getAdminKey,
  initializeGateway,
  queryLedger,
  invokeLedger,
  testFactory,
  gatewayHelper,
};
