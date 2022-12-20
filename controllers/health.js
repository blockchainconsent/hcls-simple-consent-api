/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const helperAppID = require('../helpers/app-id-helper');
const helperKeyProtect = require('../helpers/keyprotect-helper');
const helperConsent = require('../helpers/consent-helper');
const logger = require('../config/logger').getLogger('health-controller');

exports.healthCheck = async (req, res) => {
  let responseAppID; let responseIBP; let responseKeyProtect;
  const currentTime = new Date().toISOString();

  try {
    responseAppID = await helperAppID.pingAppID();
    responseKeyProtect = await helperKeyProtect.pingKeyProtect();
    responseIBP = await helperConsent.pingBlockchain();
    if (!(responseIBP instanceof Error)) {
      responseIBP = true;
    }
  } catch (error) {
    logger.error(`Service error ${error}`);
  }

  const arrServices = [
    { service: 'AppID', isConnection: responseAppID },
    { service: 'KeyProtect', isConnection: responseKeyProtect },
    { service: 'IBP', isConnection: responseIBP },
  ];
  const existProblem = arrServices.find((el) => el.isConnection !== true);
  if (existProblem) {
    return res.status(500).json({
      message: `${existProblem.service} is unhealhty`,
      currentTime,
    });
  }
  return res.status(200).json({
    message: 'Simple consent api health is OK',
    currentTime,
  });
};

exports.liveCheck = async (req, res) => {
  const currentTime = new Date().toISOString();

  try {
    await helperConsent.pingBlockchain();
  } catch (error) {
    logger.error(`IBP service error ${error}`);
    return res.status(500).json({
      message: 'IBP is unhealhty',
      currentTime,
    });
  }

  return res.status(200).json({
    message: 'Simple consent api liveness is OK',
    currentTime,
  });
};
