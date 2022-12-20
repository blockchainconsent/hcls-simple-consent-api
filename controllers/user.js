/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const helper = require('../helpers/app-id-helper');
const logger = require('../config/logger').getLogger('user-controller');

// eslint-disable-next-line max-len
const emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;

// eslint-disable-next-line complexity
exports.login = async (req, res) => {
  logger.debug('Login');

  // return 400 in case of unexpected request body fields
  const requiredFields = ['email', 'password'];
  const fields = Object.keys(req.body);
  const unexpectedFields = fields.filter((field) => !requiredFields.includes(field));
  if (unexpectedFields.length) {
    const errMsg = `Unexpected fields in request body: ${unexpectedFields}`;
    logger.error(`Failed to login user: ${errMsg}`);
    return res.status(400).json({
      error: {
        message: errMsg,
      },
      currentTime: new Date().toISOString(),
    });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: {
        message: 'Missing required login fields',
      },
      currentTime: new Date().toISOString(),
    });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: {
        message: 'email format is invalid',
      },
      currentTime: new Date().toISOString(),
    });
  }

  let tokens;
  try {
    tokens = await helper.loginAppID(email, password);
  } catch (error) {
    logger.error(`login() error : ${error}`);
    const returnStatus = error.status || 500;
    return res.status(returnStatus).json({
      error: {
        message: `Failed to login with AppID: ${error.message}`,
      },
      currentTime: new Date().toISOString(),
    });
  }
  return res.status(200).json(tokens);
};

exports.resetPassword = async (req, res) => {
  logger.debug('Reset Password');
  try {
    await helper.sendResetPasswordEmail(req);

    return res.status(200).json({
      msg: 'Password email sent successfully',
      status: 200,
    });
  } catch (error) {
    logger.error(`resetPassword() error : ${error}`);
    const returnStatus = error.status || 500;

    return res.status(returnStatus).json({
      error: {
        message: `Failed to request reset password with AppID: ${error.message}`,
      },
      currentTime: new Date().toISOString(),
    });
  }
};

exports.validateEmail = (req, res, next) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      error: {
        message: 'Missing required userId field',
      },
      currentTime: new Date().toISOString(),
    });
  }
  if (userId && !emailRegex.test(userId)) {
    return res.status(400).json({
      error: {
        message: 'Email format is invalid',
      },
      currentTime: new Date().toISOString(),
    });
  }else {
    return next();
  }
}
