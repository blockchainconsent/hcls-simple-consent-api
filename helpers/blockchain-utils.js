/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const config = require('../config').blockchain;

function getChannelName() {
  return config.channelName;
}

function getCAUrl() {
  const keys = Object.keys(config.connProfile.certificateAuthorities);
  return config.connProfile.certificateAuthorities[keys[0]].url;
}

function getCAName() {
  const keys = Object.keys(config.connProfile.certificateAuthorities);
  return config.connProfile.certificateAuthorities[keys[0]].caName;
}

function getMSP() {
  const keys = Object.keys(config.connProfile.organizations);
  return config.connProfile.organizations[keys[0]].mspid;
}

function getPeerUrl() {
  const keys = Object.keys(config.connProfile.peers);
  return config.connProfile.peers[keys[0]].url;
}

function getAdminID() {
  return config.admin;
}

function getAdminSecret() {
  return process.env.BC_ADMIN_SECRET;
}

function getChaincodeName() {
  return config.chaincodeName;
}

function getConnProfile() {
  return config.connProfile;
}

function getDiscovery() {
  return config.gatewayDiscovery;
}

exports.getChannelName = getChannelName;
exports.getCAUrl = getCAUrl;
exports.getPeerUrl = getPeerUrl;
exports.getCAName = getCAName;
exports.getMSP = getMSP;
exports.getAdminID = getAdminID;
exports.getAdminSecret = getAdminSecret;
exports.getConnProfile = getConnProfile;
exports.getChaincodeName = getChaincodeName;
exports.getDiscovery = getDiscovery;
