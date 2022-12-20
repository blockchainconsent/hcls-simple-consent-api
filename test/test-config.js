/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const token = '';
exports.token = token;

const token2 = '';
exports.token2 = token2;

exports.username = process.env.APP_ID_TEST_EMAIL;
exports.password = process.env.APP_ID_TEST_PASSWORD;
exports.url = process.env.APP_ID_URL;
exports.tenantID = process.env.APP_ID_TENANT_ID;
exports.clientID = process.env.APP_ID_CLIENT_ID;
exports.secret = process.env.APP_ID_SECRET;
exports.apikey = process.env.APP_ID_IAM_KEY;

exports.username2 = process.env.APP_ID_TEST_EMAIL2;
exports.password2 = process.env.APP_ID_TEST_PASSWORD2;

exports.keyProtectUrl = process.env.KEYPROTECT_URL;
exports.keyProtectInstanceID = process.env.KEYPROTECT_GUID;
exports.keyProtectApikey = process.env.KEYPROTECT_SERVICE_API_KEY;
exports.keyProtectRetries = 1;
exports.keyProtectRetryDelay = 3000;
exports.keyProtectTimeout = 10000;
exports.keyProtectAdminKeyName = "cm-simpleconsent-admin-ep";