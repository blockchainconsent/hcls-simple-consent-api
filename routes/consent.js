/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const express = require('express');

const consentController = require('../controllers/consent');

const appIdAuth = require('../middleware/app-id-auth');
const requestLogger = require('../middleware/request-logger');
const addConsentOption = require('../middleware/revoke-consent');

const checkConsentReader = appIdAuth.getAuthStrategy(appIdAuth.APP_ID_SCOPES.CONSENT_READ);
const checkConsentRevoke = appIdAuth.getAuthStrategy(appIdAuth.APP_ID_SCOPES.CONSENT_REVOKE);
const checkPatientReader = appIdAuth.getAuthStrategy(appIdAuth.APP_ID_SCOPES.PATIENT_READ);

const router = express.Router();

router.get('/ping', requestLogger, checkConsentReader, consentController.pingConsent);

router.post('/', requestLogger, consentController.createConsent);
router.post('/revoke', requestLogger, addConsentOption, checkConsentRevoke, consentController.createConsent);

router.get('/query', requestLogger, checkConsentReader, consentController.queryConsentsByPatientID);
router.get('/patient', requestLogger, checkPatientReader, consentController.queryPatientData);

module.exports = router;
