/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const { CloudantV1 } = require('@ibm-cloud/cloudant');
const {
  IamAuthenticator,
  BasicAuthenticator,
} = require('ibm-cloud-sdk-core');
const config = require('../config/config.json');

const log = require('../config/logger').getLogger('cloudantdbstore');

const dbConfig = {
  /**
   * Cloudant can support two types of authentication 'Legacy credentials' or 'IAM'.
   * IAM has higher priority to be used as authentication method when both types are provided.
   * As long as user provides 'iamApiKey' and 'account' values in config file
   * IAM method will be the authentication method.
   * If user provides 'url', 'username', 'password' values in config file
   * and does not provide 'iamApiKey' or 'account' values,
   * then legacy authentication method will be used.
   * If user provides 'cloudantProxyUrl' value in config file
   * connection through proxy server will be used, works only with
   * 'Legacy credentials' type of authentication.
   */
  connection: {
    url: process.env.CLOUDANT_URL,
    username: process.env.CLOUDANT_USERNAME,
    password: process.env.CLOUDANT_PASSWORD,
    account: process.env.CLOUDANT_IAM_ACCOUNT,
    iamApiKey: process.env.CLOUDANT_IAM_API_KEY,
    timeout: process.env.CLOUDANT_TIMEOUT || 5000,
    proxyUrl: process.env.CLOUDANT_PROXY_URL,
  }
};
const dbPartitionKey = config.rateLimit.dbPartitionKey;

function initCloudant() {
  const { connection } = dbConfig;

  if (!connection) {
    throw new Error('Missing DB connection configuration');
  }
  const connectionUrl = connection.proxyUrl || connection.url;

  // As long as user provides 'iamApiKey' and 'account' values in config file
  // IAM method will be the authentication method.
  const useIamAuth = connection.account && connection.iamApiKey;
  // If user provides 'url', 'username', 'password' values in config file
  // and does not provide 'iamApiKey' or 'account' values,
  // then legacy authentication method will be used.
  const useLegacyAuth = connectionUrl && connection.username && connection.password;

  let authenticator;
  if (useIamAuth) {
    log.info('Use IAM auth for DB connection');

    authenticator = new IamAuthenticator({
      apikey: connection.iamApiKey,
    });
  } else if (useLegacyAuth) {
    log.info('Use legacy auth for DB connection');

    authenticator = new BasicAuthenticator({
      username: connection.username,
      password: connection.password,
    });
  } else {
    throw new Error('Missing DB credentials');
  }
  const service = new CloudantV1({ authenticator });
  service.setServiceUrl(connectionUrl);
  return service;
}

let instance;
class CloudantHelper {
  static getInstance() {
    if (!instance) {
      instance = new CloudantHelper();
    } else if (!instance.cloudant) {
      const errMsg = 'Cloudant was not initialized during startup, please check configuration';
      log.error(errMsg);
      throw { status: 500, message: errMsg };
    }
    return instance;
  }

  async setupCloudant() {
    if (!this.cloudant) {
      try {
        this.cloudant = await initCloudant();
      } catch (err) {
        log.error(`Failed to initCloudant: ${err}`);
        throw err;
      }
    }
  }

  async pingCloudant() {
    try {
      const reply = await this.cloudant.getSessionInformation();
      log.info('Cloudant pinged successfully:', reply.result);
      return true;
    } catch (error) {
      log.error(`Failed to ping Cloudant: ${error.message}`);
      return false;
    }
  }

  async checkConnection() {
    const timeout = (promise, time, exception) => {
      let timer;
      return Promise.race(
        [promise, new Promise((res, rej) => {
          timer = setTimeout(rej, time, exception);
        })],
      )
        .finally(() => clearTimeout(timer));
    };
    const { connection } = dbConfig;
    const timeoutError = new Error(`Request timed out after ${connection.timeout} ms`);

    try {
      return await timeout(
        this.pingCloudant(),
        dbConfig.connection.timeout,
        timeoutError,
      );
    } catch (error) {
      log.error(`Cloudant service error: ${error}`);
      return false;
    }
  }

  async getOrCreateDB(db) {
    try {
      await this.cloudant.getDatabaseInformation({ db });
      log.info(`Successfully got Cloudant database ${db}`);
    } catch (err) {
      const debugMsg = `Failed to get Cloudant database ${db}: ${err.message}`;
      log.error(debugMsg);
      await this.createDB(db);
    }
  }

  async createDB(db) {
    const payloadForIndex = {
      index: { fields: ['email'] },
      name: 'cm-rate-limiter-index',
      type: 'json',
      partitioned: true
    };
    try {
      await this.cloudant.putDatabase({ db, partitioned: true });
      log.info(`Created Cloudant database ${db}`);
      await this.createIndex(db, payloadForIndex);
    } catch (e) {
      log.error(`Failed to create Cloudant database ${db}: ${e.message}`);
      throw e;
    }
  }

  async createIndex(db, params) {
    try {
      await this.cloudant.postIndex({ db, ...params });
      log.info(`Creating Cloudant index in database ${db}: ${JSON.stringify(params)}`);
    } catch (err) {
      log.error(`Failed to create index in database ${db}: ${JSON.stringify(params)}`);
    }
  }

  async saveDocument(db, document) {
    try {
      await this.cloudant.postDocument({
        db,
        document,
      });
      log.info('Document has been saved successfully');
    } catch (err) {
      log.error(err);
      throw err;
    }
  }

  async deleteDocument(db, docId) {
    try {
      const { result } = await this.cloudant.getDocument({ db, docId });
      const deletedDoc = await this.cloudant.deleteDocument({ db, docId, rev: result._rev });
      if (deletedDoc && deletedDoc.result && deletedDoc.result.ok) {
        log.info(`Document has been deleted successfully: ${JSON.stringify(deletedDoc.result)}`);
        return deletedDoc.result;
      }
      return false;
    } catch (err) {
      log.error(`Failed to delete a document in the database ${db}: ${err.message}`);
      throw err;
    }
  }

  async findByQuery(db, selector) {
    try {
      log.debug('Search for existing PII/PHI');
      const { result } = await this.cloudant.postPartitionFind({
        db,
        partitionKey: dbPartitionKey,
        selector,
      });
      return result.docs;
    } catch (err) {
      log.error(err);
    }
  }
}

module.exports = CloudantHelper;
