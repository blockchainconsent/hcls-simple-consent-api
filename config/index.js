/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const fs = require('fs');
const path = require('path');

const config = require('./config.json');

const connProfileFile = `ibp/${config.blockchain.connectionFile}`;
const connProfilePath = path.join(__dirname, connProfileFile);
const connProfile = JSON.parse(fs.readFileSync(connProfilePath, 'utf8'));
config.blockchain.connProfile = connProfile;

module.exports = config;
