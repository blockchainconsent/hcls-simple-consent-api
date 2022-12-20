/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const { expect } = require('chai');
const sinon = require('sinon');
const { assert } = require('@sinonjs/referee');
const consentHelper = require('../../../helpers/consent-helper');
const bcHelper = require('../../../helpers/blockchain-helper');
const config = require('../../../config/config.json');

const { testFactory } = consentHelper;

class CustomError extends Error {
    constructor(message, status) {
        super(message);
        this.response = {
            status,
        };
    }
}

describe('prepareToReidentifyConsents()', () => {
    const consents = Array(100).fill('consent');
    const makeChunksSpy = sinon.spy(testFactory, 'makeChunks');
    const payloadError = new CustomError('PayloadTooLargeError', 413);

    afterEach(() => {
        testFactory.reidentifyConsents.restore();
        makeChunksSpy.resetHistory();
    });

    it('should fail with 500 error', async () => {
        const error = new CustomError('Internal server error', 500);
        const reidentifyStub = sinon.stub(testFactory, 'reidentifyConsents')
            .throws(error);
        try {
            await testFactory.prepareToReidentifyConsents(consents, 'callerID', 'tenantID', 'txID');
        } catch (e) {
            assert.exception(e);
            expect(e).to.be.an.instanceof(CustomError);
            expect(e.message).to.include('Internal server error');
            expect(e.response.status).to.equal(500);
            expect(reidentifyStub.callCount).to.equal(1);
        }
    });
    it('should works without 413 error', async () => {
        const reidentifyStub = sinon.stub(testFactory, 'reidentifyConsents')
            .returnsArg(1);
        const result = await testFactory.prepareToReidentifyConsents(consents, 'callerID', 'tenantID', 'txID');
        expect(makeChunksSpy.callCount).to.equal(0);
        expect(reidentifyStub.callCount).to.equal(1);
        expect(result.length).to.equal(consents.length);
    });
    it('should works with one 413 error', async () => {
        const reidentifyStub = sinon.stub(testFactory, 'reidentifyConsents')
            .onCall(0) // onFirstCall()
            .throws(payloadError)
            .returnsArg(1);
        const result = await testFactory.prepareToReidentifyConsents(consents, 'callerID', 'tenantID', 'txID');
        expect(makeChunksSpy.callCount).to.equal(1);
        expect(reidentifyStub.callCount).to.equal(3);
        expect(result.length).to.equal(consents.length);
    });
    it('should works with several 413 errors', async () => {
        const reidentifyStub = sinon.stub(testFactory, 'reidentifyConsents')
            .onCall(0) // onFirstCall()
            .throws(payloadError)
            .onCall(1) // onSecondCall()
            .throws(payloadError)
            .onCall(2)
            .throws(payloadError)
            .onCall(3)
            .throws(payloadError)
            .returnsArg(1);
        const result = await testFactory.prepareToReidentifyConsents(consents, 'callerID', 'tenantID', 'txID');
        expect(makeChunksSpy.callCount).to.equal(4);
        expect(reidentifyStub.callCount).to.equal(9);
        expect(result.length).to.equal(consents.length);
    });
    it('should works with several 413 errors', async () => {
        const reidentifyStub = sinon.stub(testFactory, 'reidentifyConsents')
            .onCall(0)
            .throws(payloadError)
            .onCall(1)
            .returnsArg(1)
            .onCall(2)
            .throws(payloadError)
            .onCall(3)
            .throws(payloadError)
            .returnsArg(1);
        const result = await testFactory.prepareToReidentifyConsents(consents, 'callerID', 'tenantID', 'txID');
        expect(makeChunksSpy.callCount).to.equal(3);
        expect(reidentifyStub.callCount).to.equal(7);
        expect(result.length).to.equal(consents.length);
    });
});

describe('populateConsent()', () => {
    const populateConsentSpy = sinon.spy(consentHelper, 'populateConsent');
    const txID = 'txID';
    let input = {};

    beforeEach(() => {
        input = {
            PatientID: 'PatientID',
            ServiceID: 'ServiceID',
            TenantID: 'TenantID',
            FHIRPolicy: 'sensitive',
            DatatypeIDs: ['data-type-id'],
            ConsentOption: ['write'],
            Creation: 1640020606000
        };
    });

    afterEach(() => {
        populateConsentSpy.resetHistory();
    });
    it('should throw error',  () => {
        delete input.FHIRPolicy;
        try {
             consentHelper.populateConsent(input, txID);
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('Missing required field(s)');
            expect(populateConsentSpy.callCount).to.equal(1);
        }
    });
    it('should throw error',  () => {
        input.FHIRPolicy = ['sensitive'];
        try {
             consentHelper.populateConsent(input, txID);
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('FHIRPolicy must be string');
            expect(populateConsentSpy.callCount).to.equal(1);
        }
    });
    it('should throw error',  () => {
        input.FHIRProvisionType = ['sensitive'];
        try {
             consentHelper.populateConsent(input, txID);
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('FHIRProvisionType must be string');
            expect(populateConsentSpy.callCount).to.equal(1);
        }
    });
    it('should throw error',  () => {
        input.FHIRProvisionType = '';
        try {
             consentHelper.populateConsent(input, txID);
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('FHIRProvisionType must not be empty');
            expect(populateConsentSpy.callCount).to.equal(1);
        }
    });
    it('should throw error',  () => {
        input.FHIRProvisionAction = ['sensitive'];
        try {
             consentHelper.populateConsent(input, txID);
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('FHIRProvisionAction must be string');
            expect(populateConsentSpy.callCount).to.equal(1);
        }
    });
    it('should throw error',  () => {
        input.FHIRProvisionAction = '';
        try {
             consentHelper.populateConsent(input, txID);
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('FHIRProvisionAction must not be empty');
            expect(populateConsentSpy.callCount).to.equal(1);
        }
    });
    it('should throw error',  () => {
        delete input.DatatypeIDs;
        try {
             consentHelper.populateConsent({}, txID);
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('Missing required field(s)');
            expect(populateConsentSpy.callCount).to.equal(1);
        }
    });
    it('should throw error',  () => {
        input.DatatypeIDs = 'DatatypeIDs';
        try {
             consentHelper.populateConsent(input, txID);
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('DatatypeIDs must be array');
            expect(populateConsentSpy.callCount).to.equal(1);
        }
    });
    it('should throw error',  () => {
        input.DatatypeIDs = [];
        try {
             consentHelper.populateConsent(input, txID);
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('DatatypeIDs must not be empty');
            expect(populateConsentSpy.callCount).to.equal(1);
        }
    });
    it('should throw error',  () => {
        input.ConsentOption = 'DatatypeIDs';
        try {
             consentHelper.populateConsent(input, txID);
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('ConsentOption must be array');
            expect(populateConsentSpy.callCount).to.equal(1);
        }
    });
    it('should throw error',  () => {
        input.ConsentOption = [];
        try {
             consentHelper.populateConsent(input, txID);
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('Must specify at least one consent option');
            expect(populateConsentSpy.callCount).to.equal(1);
        }
    });
    it('should throw error',  () => {
        input.ConsentOption = ['write','read','deny'];
        try {
             consentHelper.populateConsent(input, txID);
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('Too many consent options');
            expect(populateConsentSpy.callCount).to.equal(1);
        }
    });
    it('should throw error',  () => {
        input.ConsentOption = ['read','deny'];
        try {
             consentHelper.populateConsent(input, txID);
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('deny cannot be paired with another consent option');
            expect(populateConsentSpy.callCount).to.equal(1);
        }
    });
    it('should throw error',  () => {
        input.ConsentOption = ['write','deny'];
        try {
             consentHelper.populateConsent(input, txID);
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('deny cannot be paired with another consent option');
            expect(populateConsentSpy.callCount).to.equal(1);
        }
    });
    it('should throw error for invalid consent options',  () => {
        input.ConsentOption = ['consent','option'];
        try {
             consentHelper.populateConsent(input, txID);
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('invalid consent option');
            expect(populateConsentSpy.callCount).to.equal(1);
        }
    });
    it('should throw error for one valid and one invalid consent options',  () => {
        input.ConsentOption = ['write',2];
        try {
             consentHelper.populateConsent(input, txID);
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('invalid consent option');
            expect(populateConsentSpy.callCount).to.equal(1);
        }
    });
    it('should throw error',  () => {
        input.Expiration = 'not a number';
        try {
             consentHelper.populateConsent(input, txID);
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('Invalid Expiration');
            expect(populateConsentSpy.callCount).to.equal(1);
        }
    });

    it('should works', () => {
        const result = consentHelper.populateConsent(input, txID);

        expect(result.ConsentID).to.equal(txID);
        expect(result.Creation).to.equal(`${input.Creation}`);
        expect(typeof result.DatatypeIDs).to.equal('string');
        expect(result.DatatypeIDs).to.equal(JSON.stringify(input.DatatypeIDs));
        expect(typeof result.ConsentOption).to.equal('string');
        expect(result.ConsentOption).to.equal(JSON.stringify(input.ConsentOption));
        expect(populateConsentSpy.callCount).to.equal(1);
    });
});

describe('pingBlockchain()', async () => {
    const { pingTimeout: defaultPingTimeout } = config.blockchain;
    const pingBlockchainSpy = sinon.spy(consentHelper, 'pingBlockchain');
    const setTimeoutPromise = (timeout) => {
        return new Promise((resolve) => setTimeout(resolve, timeout));
    };

    afterEach(() => {
        bcHelper.queryLedger.restore();
        pingBlockchainSpy.resetHistory();
        config.blockchain.pingTimeout = defaultPingTimeout;
    });

    it('should fail', async () => {
        const error = new Error('Internal server error');
        const queryLedgerStub = sinon.stub(bcHelper, 'queryLedger')
            .throws(error);
        try {
            await consentHelper.pingBlockchain();
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('Failed to pingBlockchain: Internal server error');
            expect(queryLedgerStub.callCount).to.equal(1);
            expect(pingBlockchainSpy.callCount).to.equal(1);
        }
    });

    it('should fail with timed out error', async () => {
        config.blockchain.pingTimeout = 1000;
        const queryLedgerStub = sinon.stub(bcHelper, 'queryLedger')
            .returns(setTimeoutPromise(1500));
        try {
            await consentHelper.pingBlockchain();
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include(`Failed to pingBlockchain: Request timed out after ${config.blockchain.pingTimeout} ms`);
            expect(queryLedgerStub.callCount).to.equal(1);
            expect(pingBlockchainSpy.callCount).to.equal(1);
        }
    });

    it('should works', async () => {
        const queryLedgerStub = sinon.stub(bcHelper, 'queryLedger')
            .returns(setTimeoutPromise(500));

        await consentHelper.pingBlockchain();
        expect(queryLedgerStub.callCount).to.equal(1);
        expect(pingBlockchainSpy.callCount).to.equal(1);
    });

    it('should works', async () => {
        const queryLedgerStub = sinon.stub(bcHelper, 'queryLedger');

        await consentHelper.pingBlockchain();
        expect(queryLedgerStub.callCount).to.equal(1);
        expect(pingBlockchainSpy.callCount).to.equal(1);
    });
});

describe('checkExistConsent()', async () => {
    const checkExistConsentSpy = sinon.spy(consentHelper, 'checkExistConsent');

    afterEach(() => {
        bcHelper.queryLedger.restore();
        checkExistConsentSpy.resetHistory();
    });

    it('should fail', async () => {
        const error = new Error('Internal server error');
        const queryLedgerStub = sinon.stub(bcHelper, 'queryLedger')
            .throws(error);
        try {
            await consentHelper.checkExistConsent();
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('Failed to checkExistConsent: Internal server error');
            expect(queryLedgerStub.callCount).to.equal(1);
            expect(checkExistConsentSpy.callCount).to.equal(1);
        }
    });

    it('should works', async () => {
        const queryLedgerStub = sinon.stub(bcHelper, 'queryLedger')
            .returns('true');

        const result = await consentHelper.checkExistConsent();
        expect(result).to.equal(true);
        expect(queryLedgerStub.callCount).to.equal(1);
        expect(checkExistConsentSpy.callCount).to.equal(1);
    });

    it('should works', async () => {
        const queryLedgerStub = sinon.stub(bcHelper, 'queryLedger')
            .returns('false');

        const result = await consentHelper.checkExistConsent();
        expect(result).to.equal(false);
        expect(queryLedgerStub.callCount).to.equal(1);
        expect(checkExistConsentSpy.callCount).to.equal(1);
    });
});

describe('writeToBC()', async () => {
    const writeToBCSpy = sinon.spy(consentHelper, 'writeToBC');

    afterEach(() => {
        bcHelper.invokeLedger.restore();
        writeToBCSpy.resetHistory();
    });

    it('should fail with empty parameter', async () => {
        const error = new Error('Internal server error');
        const invokeLedgerStub = sinon.stub(bcHelper, 'invokeLedger')
            .throws(error);
        try {
            await consentHelper.writeToBC();
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('Failed to writeToBC: Cannot convert undefined or null to object');
            expect(invokeLedgerStub.callCount).to.equal(0);
            expect(writeToBCSpy.callCount).to.equal(1);
        }
    });

    it('should fail', async () => {
        const error = new Error('Internal server error');
        const invokeLedgerStub = sinon.stub(bcHelper, 'invokeLedger')
            .throws(error);
        try {
            await consentHelper.writeToBC({});
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('Failed to writeToBC: Internal server error');
            expect(invokeLedgerStub.callCount).to.equal(1);
            expect(writeToBCSpy.callCount).to.equal(1);
        }
    });

    it('should works', async () => {
        const invokeLedgerStub = sinon.stub(bcHelper, 'invokeLedger');

        await consentHelper.writeToBC({});
        expect(invokeLedgerStub.callCount).to.equal(1);
        expect(writeToBCSpy.callCount).to.equal(1);
    });

    it('should works', async () => {
        const invokeLedgerStub = sinon.stub(bcHelper, 'invokeLedger');

        await consentHelper.writeToBC({
            ConsentID: 'txID',
            PatientID: 'PatientID',
            ServiceID: 'ServiceID',
            TenantID: 'TenantID',
            FHIRPolicy: 'FHIRPolicy',
            DatatypeIDs: JSON.stringify(['DatatypeIDs']),
            ConsentOption: JSON.stringify(['ConsentOption']),
            Creation: 'creation',
            Expiration: 'expiration'
        });
        expect(invokeLedgerStub.callCount).to.equal(1);
        expect(writeToBCSpy.callCount).to.equal(1);
    });
});

describe('queryFromBC()', async () => {
    const queryFromBCSpy = sinon.spy(consentHelper, 'queryFromBC');

    afterEach(() => {
        bcHelper.queryLedger.restore();
        queryFromBCSpy.resetHistory();
    });

    it('should fail with empty parameters', async () => {
        const queryLedgerStub = sinon.stub(bcHelper, 'queryLedger');
        try {
            await consentHelper.queryFromBC();
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('Failed to queryFromBC: Missing required field(s)');
            expect(queryLedgerStub.callCount).to.equal(0);
            expect(queryFromBCSpy.callCount).to.equal(1);
        }
    });

    it('should fail with queryLedger error', async () => {
        const error = new Error('Internal server error');
        const queryLedgerStub = sinon.stub(bcHelper, 'queryLedger')
            .throws(error);
        try {
            await consentHelper.queryFromBC('', '', {});
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('Failed to queryFromBC: Internal server error');
            expect(queryLedgerStub.callCount).to.equal(1);
            expect(queryFromBCSpy.callCount).to.equal(1);
        }
    });

    it('should fail with incorrect response', async () => {
        const queryLedgerStub = sinon.stub(bcHelper, 'queryLedger')
            .returns('invalid');

        try {
            await consentHelper.queryFromBC('', '', {});
        } catch (e) {
            assert.exception(e);
            expect(e.message).to.include('Failed to queryFromBC: Unexpected token i in JSON at position 0');
            expect(queryLedgerStub.callCount).to.equal(1);
            expect(queryFromBCSpy.callCount).to.equal(1);
        }
    });

    it('should works with default empty result', async () => {
        const queryLedgerStub = sinon.stub(bcHelper, 'queryLedger');

        const result = await consentHelper.queryFromBC('', '', {});
        expect(result.records.length).to.equal(0);
        expect(result.bookmark).to.equal('');
        expect(queryLedgerStub.callCount).to.equal(1);
        expect(queryFromBCSpy.callCount).to.equal(1);
    });

    it('should works', async () => {
        const queryLedgerStub = sinon.stub(bcHelper, 'queryLedger')
            .returns('{"records":["record","record"],"bookmark":"bookmark"}');

        const result = await consentHelper.queryFromBC('', '', {});
        expect(result.records.length).to.equal(2);
        expect(result.bookmark).to.equal('bookmark');
        expect(queryLedgerStub.callCount).to.equal(1);
        expect(queryFromBCSpy.callCount).to.equal(1);
    });
});
