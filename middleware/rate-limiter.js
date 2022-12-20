const config = require('../config/config.json');
const CloudantHelper = require('../db/cloudantDB');
const cryptography  = require('../helpers/encrypt-decrypt-helper');
const log = require('../config/logger').getLogger('rate-limiter');

const rateLimiter = async (req, res, next) => {
  const dbName = config.rateLimit.dbName;
  const windowMs = config.rateLimit.windowMs;

  try {
    //get email from request body and encrypt it using cryptography helper class
    const encryptedEmail = cryptography.encrypt(req.body.userId);
    //get the cloudant instance
    cloudantClient = CloudantHelper.getInstance();
    const query = {
      email: { $eq: encryptedEmail }
    };
    //get the record from cloudantdb if exist for this userId
    const existingRecord = await cloudantClient.findByQuery(dbName, query);
    if (existingRecord && existingRecord.length == 0) {
      const dbPartitionKey = config.rateLimit.dbPartitionKey;
      const docId = `${dbPartitionKey}:${encryptedEmail}`;
      //Create record to save data in cloudant db
      const record = {
        _id: `${dbPartitionKey}:${encryptedEmail}`,
        email: encryptedEmail
      }
      //Save the document in cloudant db
      cloudantClient.saveDocument(dbName, record);
      //call and forgot delete document query after one minute
      setTimeout(() => {
        cloudantClient.deleteDocument(dbName, docId);
        log.info('Document has been deleted successfully');
      }, windowMs);
      return next();
    } else {
      const error = config.rateLimit.message;
      return next(error);
    }
  } catch (err) {
    log.error(`Failed to save/delete IP in DB for reset password request ${err.message}`);
    throw err;
  }
}

module.exports = rateLimiter;


