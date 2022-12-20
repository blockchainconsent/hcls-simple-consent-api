/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

/* eslint-disable no-unused-expressions */

const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(chaiHttp);
chai.use(require('chai-sorted'));

const { expect } = chai;

const server = require('../../app');
const config = require('../test-config');
const constants = require('../constants');

const patientIDHeader = constants.REQUEST_HEADERS.PATIENT_ID;

require('./test-login');

const seqNum = Math.floor(Math.random() * 1000);

// test consent field values (generic)
const patientID = `integration-test-patient-${seqNum}`;
const serviceID = `integration-test-service-${seqNum}`;
const datatypeIDs = [`integration-test-datatype-${seqNum}`];
const consentOption = ['read'];
const creation = Date.now();
const expiration = 30000000000;
const tenantID = '5102';

// test consent field values (FHIR)
const fhirResourceID = 'consent-001';
const fhirResourceVersion = '1';
const fhirPolicy = 'regular';
const fhirStatus = 'active';
const fhirProvisionType = 'permit';
const fhirProvisionAction = 'disclose';
const fhirPerformerIDSystem = 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType';
const fhirPerformerIDValue = '0ba43008-1be2-4034-b50d-b76ff0110eae';
const fhirPerformerDisplay = 'Old Payer';
const fhirRecipientIDSystem = 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType';
const fhirRecipientIDValue = '93a4bb61-4cc7-469b-bf1b-c9cc24f8ace0';
const fhirRecipientDisplay = 'New Payer';

// patient id for querying fhir server (patient support API)
const fhirPatientID = 'patient-1';

let totalConsents;

describe('GET ping', function getTest() {
    this.timeout(10000); // increase timeout for blockchain calls
    const path = '/simple-consent/api/v1/consent/ping';

    it('should return 200 on success', (done) => {
        // wait for server startup and hlf gateway connect
        setTimeout(() => {
            chai
            .request(server)
            .get(path)
            .send()
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.include('GET /ping was successful');
                done();
            });
        }, 3000);
    });
});

// eslint-disable-next-line max-lines-per-function
describe('POST invalid consent (generic)', function postInvalidGenericTest() {
    this.timeout(10000); // increase timeout for blockchain calls
    const path = '/simple-consent/api/v1/consent';

    it('should return 400 on failure, missing PatientID', (done) => {
        const invalidInputData = {};

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('Missing required field(s)');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });
    
    it('should return 400 on failure, empty PatientID', (done) => {
        const invalidInputData = {
            PatientID: '',
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('Missing required field(s)');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, missing TenantID', (done) => {
        const invalidInputData = {
            PatientID: patientID,
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('Missing required field(s)');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, missing DatatypeIDs', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            ServiceID: serviceID,
            TenantID: tenantID,
            ConsentOption: consentOption,
            Creation: creation,
            Expiration: expiration
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('Missing required field(s)');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, empty DatatypeIDs', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            ServiceID: serviceID,
            TenantID: tenantID,
            DatatypeIDs: [],
            ConsentOption: consentOption,
            Creation: creation,
            Expiration: expiration
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('DatatypeIDs must not be empty');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, DatatypeIDs not array', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            ServiceID: serviceID,
            TenantID: tenantID,
            DatatypeIDs: 'invalid',
            ConsentOption: consentOption,
            Creation: creation,
            Expiration: expiration
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('DatatypeIDs must be array');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, empty ConsentOption', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            ServiceID: serviceID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            ConsentOption: [],
            Creation: creation,
            Expiration: expiration
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('Must specify at least one consent option');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, ConsentOption not array', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            ServiceID: serviceID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            ConsentOption: 'invalid',
            Creation: creation,
            Expiration: expiration
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('ConsentOption must be array');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, invalid ConsentOption', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            ServiceID: serviceID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            ConsentOption: ['invalid'],
            Creation: creation,
            Expiration: expiration
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('invalid consent option');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, deny paired with another consent option', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            ServiceID: serviceID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            ConsentOption: ['read', 'deny'],
            Creation: creation,
            Expiration: expiration
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('deny cannot be paired with another consent option');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, missing Creation', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            ServiceID: serviceID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            ConsentOption: consentOption,
            Expiration: expiration
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('Missing required field(s)');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, invalid Expiration', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            ServiceID: serviceID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            ConsentOption: consentOption,
            Creation: creation,
            Expiration: 'invalid'
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('Invalid Expiration');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });
});

describe('POST invalid consent (FHIR)', function postInvalidFHIRTest() {    
    const path = '/simple-consent/api/v1/consent';

    it('should return 400 on failure, FHIRResourceID not string', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRResourceID: ['invalid'],
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirProvisionAction
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRResourceID must be string');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, empty FHIRResourceID', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRResourceID: '',
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirProvisionAction
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRResourceID must not be empty');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, FHIRPolicy not string', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: ['invalid'],
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirProvisionAction
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRPolicy must be string');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, empty FHIRPolicy', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: '',
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirProvisionAction
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRPolicy must not be empty');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, FHIRStatus not string', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: ['invalid'],
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirProvisionAction
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRStatus must be string');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, empty FHIRStatus', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: '',
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirProvisionAction
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRStatus must not be empty');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, FHIRProvisionType not string', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: fhirStatus,
            FHIRProvisionType: [''],
            FHIRProvisionAction: fhirProvisionAction
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRProvisionType must be string');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, empty FHIRProvisionType', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: fhirStatus,
            FHIRProvisionType: '',
            FHIRProvisionAction: fhirProvisionAction
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRProvisionType must not be empty');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, FHIRProvisionAction not string', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: ['']
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRProvisionAction must be string');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, empty FHIRProvisionAction', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: '',
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRProvisionAction must not be empty');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, FHIRPerformerIDSystem not string', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirProvisionAction,
            FHIRPerformerIDSystem: ['']
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRPerformerIDSystem must be string');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, empty FHIRPerformerIDSystem', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirProvisionAction,
            FHIRPerformerIDSystem: ''
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRPerformerIDSystem must not be empty');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, FHIRPerformerIDValue not string', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirPerformerIDSystem,
            FHIRPerformerIDSystem: fhirPerformerIDSystem,
            FHIRPerformerIDValue: ['']
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRPerformerIDValue must be string');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, empty FHIRPerformerIDValue', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirProvisionAction,
            FHIRPerformerIDSystem: fhirPerformerIDSystem,
            FHIRPerformerIDValue: ''
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRPerformerIDValue must not be empty');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, FHIRPerformerDisplay not string', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirPerformerIDSystem,
            FHIRPerformerIDSystem: fhirPerformerIDSystem,
            FHIRPerformerIDValue: fhirPerformerIDValue,
            FHIRPerformerDisplay: ['']
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRPerformerDisplay must be string');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, empty FHIRPerformerDisplay', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirProvisionAction,
            FHIRPerformerIDSystem: fhirPerformerIDSystem,
            FHIRPerformerIDValue: fhirPerformerIDValue,
            FHIRPerformerDisplay: ''
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRPerformerDisplay must not be empty');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, FHIRRecipientIDSystem not string', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirPerformerIDSystem,
            FHIRPerformerIDSystem: fhirPerformerIDSystem,
            FHIRPerformerIDValue: fhirPerformerIDValue,
            FHIRPerformerDisplay: fhirPerformerDisplay,
            FHIRRecipientIDSystem: ['']
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRRecipientIDSystem must be string');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, empty FHIRRecipientIDSystem', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirProvisionAction,
            FHIRPerformerIDSystem: fhirPerformerIDSystem,
            FHIRPerformerIDValue: fhirPerformerIDValue,
            FHIRPerformerDisplay: fhirPerformerDisplay,
            FHIRRecipientIDSystem: ''
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRRecipientIDSystem must not be empty');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, FHIRRecipientIDValue not string', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirPerformerIDSystem,
            FHIRPerformerIDSystem: fhirPerformerIDSystem,
            FHIRPerformerIDValue: fhirPerformerIDValue,
            FHIRPerformerDisplay: fhirPerformerDisplay,
            FHIRRecipientIDSystem: fhirRecipientIDSystem,
            FHIRRecipientIDValue: ['']
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRRecipientIDValue must be string');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, empty FHIRRecipientIDValue', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirProvisionAction,
            FHIRPerformerIDSystem: fhirPerformerIDSystem,
            FHIRPerformerIDValue: fhirPerformerIDValue,
            FHIRPerformerDisplay: fhirPerformerDisplay,
            FHIRRecipientIDSystem: fhirRecipientIDSystem,
            FHIRRecipientIDValue: ''
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRRecipientIDValue must not be empty');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, FHIRRecipientDisplay not string', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirPerformerIDSystem,
            FHIRPerformerIDSystem: fhirPerformerIDSystem,
            FHIRPerformerIDValue: fhirPerformerIDValue,
            FHIRPerformerDisplay: fhirPerformerDisplay,
            FHIRRecipientIDSystem: fhirRecipientIDSystem,
            FHIRRecipientIDValue: fhirRecipientIDValue,
            FHIRRecipientDisplay: ['']
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRRecipientDisplay must be string');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });

    it('should return 400 on failure, empty FHIRRecipientDisplay', (done) => {
        const invalidInputData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirProvisionAction,
            FHIRPerformerIDSystem: fhirPerformerIDSystem,
            FHIRPerformerIDValue: fhirPerformerIDValue,
            FHIRPerformerDisplay: fhirPerformerDisplay,
            FHIRRecipientIDSystem: fhirRecipientIDSystem,
            FHIRRecipientIDValue: fhirRecipientIDValue,
            FHIRRecipientDisplay: ''
        };

        chai
            .request(server)
            .post(path)
            .send(invalidInputData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('FHIRRecipientDisplay must not be empty');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(0);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('Consent');
                done();
            });
    });
});

describe('POST valid consent (generic)', function postValidGenericTest() {
    this.timeout(10000); // increase timeout for blockchain calls
    const path = '/simple-consent/api/v1/consent';

    it('should return 200 on success', (done) => {
        const consentData = {
            PatientID: patientID,
            ServiceID: serviceID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            ConsentOption: consentOption,
            Creation: creation,
            Expiration: expiration
        };

        chai
            .request(server)
            .post(path)
            .send(consentData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('POST /consent was successful');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(1);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('');
                done();
            });
    });

    it('should return 200 on success, no Expiration', (done) => {
        const consentData = {
            PatientID: patientID,
            ServiceID: serviceID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            ConsentOption: consentOption,
            Creation: creation
        };

        chai
            .request(server)
            .post(path)
            .send(consentData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('POST /consent was successful');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(1);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('');
                done();
            });
    });
});

describe('POST valid consent (FHIR)', function postValidFHIRTest() {
    this.timeout(10000); // increase timeout for blockchain calls
    const path = '/simple-consent/api/v1/consent';

    it('should return 200 on success', (done) => {
        const consentData = {
            PatientID: patientID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDs,
            Creation: creation,
            Expiration: expiration,
            FHIRResourceID: fhirResourceID,
            FHIRResourceVersion: fhirResourceVersion,
            FHIRPolicy: fhirPolicy,
            FHIRStatus: fhirStatus,
            FHIRProvisionType: fhirProvisionType,
            FHIRProvisionAction: fhirProvisionAction,
            FHIRPerformerIDSystem: fhirPerformerIDSystem,
            FHIRPerformerIDValue: fhirPerformerIDValue,
            FHIRPerformerDisplay: fhirPerformerDisplay,
            FHIRRecipientIDSystem: fhirRecipientIDSystem,
            FHIRRecipientIDValue: fhirRecipientIDValue,
            FHIRRecipientDisplay: fhirRecipientDisplay
        };

        chai
            .request(server)
            .post(path)
            .send(consentData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('POST /consent was successful');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(1);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('');
                done();
            });
    });
});

describe('GET query consents by patientID', function queryTest() {
    this.timeout(10000);
    const path = '/simple-consent/api/v1/consent/query';

    const unmatchedTenantID = 'tenant1';

    // save consent with TenantID that does not match AppID user's TenantID,
    // to ensure that it is not returned by successful query
    before((done) => {
        const consentData = {
            PatientID: patientID,
            ServiceID: serviceID,
            TenantID: unmatchedTenantID,
            DatatypeIDs: datatypeIDs,
            ConsentOption: consentOption,
            Creation: creation,
            Expiration: expiration
        };

        chai
            .request(server)
            .post('/simple-consent/api/v1/consent')
            .send(consentData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('POST /consent was successful');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(1);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('');
                done();
            });
    });

    it('should return 400 on failure, no patientID', (done) => {
        chai
            .request(server)
            .get(path)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('Missing PatientID header parameter');
                done();
            });
    });

    it('should return 400 on failure, empty patientID', (done) => {
        chai
            .request(server)
            .get(path)
            .set({ [patientIDHeader]: '' })
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('Missing PatientID header parameter');
                done();
            });
    });

    it('should return 200 on success, consent data queried (empty)', (done) => {
        chai
            .request(server)
            .get(path)
            .set({ [patientIDHeader]: 'invalid' })
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('GET /consent was successful');
                expect(res.body).to.have.property('payload');
                expect(res.body.payload).to.be.an('array');
                expect(res.body.payload).to.be.empty;
                done();
            });
    });

    it('should return 200 on success, consent data queried', (done) => {
        chai
            .request(server)
            .get(path)
            .set({ [patientIDHeader]: patientID })
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('GET /consent was successful');
                expect(res.body).to.have.property('payload');
                expect(res.body.payload).to.be.an('array');
                expect(res.body.payload).to.not.be.empty;
                expect(res.body.payload).to.have.lengthOf(4);
                for (let i = 0; i < res.body.payload.length; i += 1) {
                    expect(res.body.payload[i].PatientID).to.equal(patientID);
                    expect(res.body.payload[i].TenantID).to.equal(tenantID);
                }
                done();
            });
    });
});

describe('GET query consents by patientID, sorted in desc order by Creation', function queryTest() {
    this.timeout(50000);
    const path = '/simple-consent/api/v1/consent';
    const datatypeIDsTest1 = [`integration-test-datatype-${seqNum}-test`];
    const consentOptionTest1 = ['read'];
    const creationTest1 = Date.now();

    it('should return 200 on success, consent data saved', (done) => {
        const consentData = {
            PatientID: patientID,
            ServiceID: serviceID,
            TenantID: tenantID,
            DatatypeIDs: datatypeIDsTest1,
            ConsentOption: consentOptionTest1,
            Creation: creationTest1,
            Expiration: expiration
        };

        chai
            .request(server)
            .post(path)
            .send(consentData)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('POST /consent was successful');
                expect(res.body).to.have.property('successes');
                expect(res.body.successes).to.be.an('array');
                expect(res.body.successes).to.have.lengthOf(1);
                expect(res.body).to.have.property('failures');
                expect(res.body.failures).to.be.an('array');
                expect(res.body.failures).to.have.lengthOf(0);
                expect(res.body).to.have.property('failure_type');
                expect(res.body.failure_type).to.equal('');
                done();
            });
    });

    it('should return 200 on success, consent data queried by Creation in desc order', (done) => {
        chai
            .request(server)
            .get('/simple-consent/api/v1/consent/query')
            .set({ [patientIDHeader]: patientID })
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                totalConsents = res.body.payload.length;
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('GET /consent was successful');
                expect(res.body).to.have.property('payload');
                expect(res.body.payload).to.be.an('array');
                expect(res.body.payload).to.not.be.empty;
                expect(res.body.payload).to.have.lengthOf(5);
                expect(res.body.payload).to.be.descendingBy('Creation');
                done();
            });
    });

    it('should return 1 consent, consent data queried by pagination pageSize=1', (done) => {
        chai
            .request(server)
            .get('/simple-consent/api/v1/consent/query?pageSize=1')
            .set({ [patientIDHeader]: patientID })
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('GET /consent was successful');
                expect(res.body).to.have.property('payload');
                expect(res.body.payload).to.be.an('array');
                expect(res.body.payload).to.not.be.empty;
                expect(res.body.payload.length).to.equal(1);
                done();
            });
    });

    it('should return all consents, consent data queried by defaul pagination pageSize=-1', (done) => {
        chai
            .request(server)
            .get('/simple-consent/api/v1/consent/query?pageSize=-1')
            .set({ [patientIDHeader]: patientID })
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('GET /consent was successful');
                expect(res.body).to.have.property('payload');
                expect(res.body.payload).to.be.an('array');
                expect(res.body.payload).to.not.be.empty;
                expect(res.body.payload.length).to.equal(totalConsents);
                done();
            });
    });
});

describe('GET query patient data by patientID', function queryTest() {
    this.timeout(50000);
    const path = '/simple-consent/api/v1/consent/patient';

    it('should return 400 on failure, no patientID', (done) => {
        chai
            .request(server)
            .get(path)
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('Missing PatientID header parameter');
                done();
            });
    });

    it('should return 400 on failure, empty patientID', (done) => {
        chai
            .request(server)
            .get(path)
            .set({ [patientIDHeader]: '' })
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('Missing PatientID header parameter');
                done();
            });
    });

    it('should return 400 on failure, invalid TenantID', (done) => {
        chai
            .request(server)
            .get(path)
            .set({ [patientIDHeader]: fhirPatientID })
            .set({ 'Authorization': `Bearer ${config.token2}` })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.include('is not onboarded');
                done();
            });
    });

    it('should return 204 on invalid patient id', (done) => {
        chai
            .request(server)
            .get(path)
            .set({ [patientIDHeader]: 'invalid' })
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(204);
                done();
            });
    });

    it('should return 200 on success, patient data queried', (done) => {
        chai
            .request(server)
            .get(path)
            .set({ [patientIDHeader]: fhirPatientID })
            .set({ 'Authorization': `Bearer ${config.token}` })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('GET /patient was successful');
                expect(res.body).to.have.property('payload');
                expect(res.body.payload).to.be.an('object');
                expect(res.body.payload).to.not.be.empty;
                expect(res.body.payload.prefix).to.be.an('array');
                expect(res.body.payload.given).to.be.an('array');
                expect(res.body.payload.family).to.be.a('string');
                expect(res.body.payload.email).to.be.a('string');
                done();
            });
    });
});
