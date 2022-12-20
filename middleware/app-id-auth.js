/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const passport = require('passport');
const { APIStrategy } = require('ibmcloud-appid');

const url = process.env.APP_ID_URL;
const tenantID = process.env.APP_ID_TENANT_ID;
const oauthServerUrl = `${url}/oauth/v4/${tenantID}`;

const APP_ID_SCOPES = {
  CONSENT_READ: 'consent.read',
  CONSENT_REVOKE: 'consent.revoke',
  PATIENT_READ: 'patient.read',
};

passport.use(
  new APIStrategy({
    oauthServerUrl,
  }),
);

const authenticateStandardUser = passport.authenticate(APIStrategy.STRATEGY_NAME, {
  session: false,
});

const authenticateConsentReader = passport.authenticate(APIStrategy.STRATEGY_NAME, {
  session: false,
  scope: APP_ID_SCOPES.CONSENT_READ,
});

const authenticateConsentRevoke = passport.authenticate(APIStrategy.STRATEGY_NAME, {
  session: false,
  scope: APP_ID_SCOPES.CONSENT_REVOKE,
});

const authenticatePatientReader = passport.authenticate(APIStrategy.STRATEGY_NAME, {
  session: false,
  scope: APP_ID_SCOPES.PATIENT_READ,
});

const getAuthStrategy = (scope) => {
  let authStrategy;
  if (scope === APP_ID_SCOPES.CONSENT_READ) {
    authStrategy = authenticateConsentReader;
  } else if (scope === APP_ID_SCOPES.CONSENT_REVOKE) {
    authStrategy = authenticateConsentRevoke;
  } else if (scope === APP_ID_SCOPES.PATIENT_READ) {
    authStrategy = authenticatePatientReader;
  } else {
    authStrategy = authenticateStandardUser;
  }
  return authStrategy;
};

module.exports = {
  APP_ID_SCOPES,
  getAuthStrategy,
};
