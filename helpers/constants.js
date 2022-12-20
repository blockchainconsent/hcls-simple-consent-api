/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

exports.REQUEST_HEADERS = {
  PATIENT_ID: 'x-cm-patientid',
  TENANT_ID: 'x-cm-tenantid',
  TRANSACTION_ID: 'x-cm-txn-id',
};

exports.SESSIONS = {
  TRANSACTION: 'transaction',
};

exports.TENANT_FIELDS = [
  'appIdFhirUrl',
  'appIdFhirTenantId',
  'appIdFhirClientId',
  'appIdFhirClientSecret',
  'appIdFhirHost',
];

exports.QUERY_PARAMS = {
  PAGE_SIZE: 50,
};
