/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

require('dotenv').config();

const { expect } = require('chai');
const { Wallets } = require('fabric-network');
const { helperKeyProtect } = require('hcls-common');
const sinon = require('sinon');
const { assert } = require('@sinonjs/referee');
const blockchainHelper = require('../../../helpers/blockchain-helper');
const config = require('../../test-config');
const utils = require('../../../helpers/blockchain-utils');

const { testFactory, gatewayHelper } = blockchainHelper;

describe('blockchain-helper', function blockchainTests() {
    this.timeout(20000);
    before(() => {
        const keyProtectDataObj = {
            url: config.keyProtectUrl,
            instanceID: config.keyProtectInstanceID,
            apikey: config.keyProtectApikey,
            retries: config.keyProtectRetries,
            retryDelay: config.keyProtectRetryDelay,
            timeout: config.keyProtectTimeout
        };
        helperKeyProtect.setConfig(keyProtectDataObj);
    });
    describe('getAdminKey()', () => {

        describe('valid', () => {
            it('get key with KeyProtect check', async () => {
                const existingAdminKey = await helperKeyProtect.getNewestKeyByName(config.keyProtectAdminKeyName);

                const adminKey = await blockchainHelper.getAdminKey();
                expect(adminKey).to.have.property('public');
                expect(adminKey.public).to.include('BEGIN CERTIFICATE');
                expect(adminKey).to.have.property('private_key');
                expect(adminKey.private_key).to.include('BEGIN PRIVATE KEY');

                // expect admin key not to be replaced
                expect(adminKey).to.deep.equal(existingAdminKey);
            });

            it('get key without KeyProtect check (enroll to CA)', async () => {
                const existingAdminKey = await helperKeyProtect.getNewestKeyByName(config.keyProtectAdminKeyName);

                const adminKey = await blockchainHelper.getAdminKey(true);
                expect(adminKey).to.have.property('public');
                expect(adminKey.public).to.include('BEGIN CERTIFICATE');
                expect(adminKey).to.have.property('private_key');
                expect(adminKey.private_key).to.include('BEGIN PRIVATE KEY');

                // expect admin key to be replaced
                expect(adminKey).not.to.deep.equal(existingAdminKey);
            });
        });
        it('should fail', async () => {
            const error = new Error('Some error');
            const enrollAdminToCAStub = sinon.stub(testFactory, 'enrollAdminToCA')
                .onCall(0)
                .throws(error);
            try {
                await blockchainHelper.getAdminKey(true);
            } catch (e) {
                assert.exception(e);
                expect(e.message).to.equal('Some error');
                expect(enrollAdminToCAStub.callCount).to.equal(1);
            }
        });
        it('should fail', async () => {
            const error = new Error('Some error');
            const getNewestKeyByNameStub = sinon.stub(helperKeyProtect, 'getNewestKeyByName')
                .onCall(0)
                .throws(error);
            try {
                await blockchainHelper.getAdminKey();
            } catch (e) {
                assert.exception(e);
                expect(e.message).to.equal('Some error');
                expect(getNewestKeyByNameStub.callCount).to.equal(1);
            }
        });
    });

    describe('initializeGateway()', () => {
        afterEach(() => {
            testFactory.tryConnectGateway.restore();
        });
        it('should fail', async () => {
            const error = new Error('Internal server error');
            const tryConnectGatewayStub = sinon.stub(testFactory, 'tryConnectGateway')
                .onCall(0) // onFirstCall()
                .throws(error);
            try {
                await blockchainHelper.initializeGateway();
            } catch (e) {
                assert.exception(e);
                expect(e.message).to.equal('Failed to initialize gateway: Internal server error');
                expect(tryConnectGatewayStub.callCount).to.equal(1);
            }
        });
        it('should fail two times', async () => {
            const accessError = new Error('access denied');
            const error = new Error('Internal server error');
            const tryConnectGatewayStub = sinon.stub(testFactory, 'tryConnectGateway')
                .onCall(0) // onFirstCall()
                .throws(accessError)
                .onCall(1) // onSecondCall()
                .throws(error);
            try {
                await blockchainHelper.initializeGateway();
            } catch (e) {
                assert.exception(e);
                expect(e.message).to.equal('Error re-enrolling admin user: Error: Internal server error');
                expect(tryConnectGatewayStub.callCount).to.equal(2);
            }
        });
        it('should work after catch error', async () => {
            const accessError = new Error('access denied');
            gatewayHelper.gateway = {
                disconnect: sinon.spy(),
            };
            const tryConnectGatewayStub = sinon.stub(testFactory, 'tryConnectGateway')
                .onCall(0) // onFirstCall()
                .throws(accessError);
            await blockchainHelper.initializeGateway();
            expect(tryConnectGatewayStub.callCount).to.equal(2);
            expect(gatewayHelper.gateway.disconnect.callCount).to.equal(1);
        });
        it('should work', async () => {
            const tryConnectGatewayStub = sinon.stub(testFactory, 'tryConnectGateway');
            await blockchainHelper.initializeGateway();
            expect(tryConnectGatewayStub.callCount).to.equal(1);
        });
    });

    describe('queryLedger()', () => {
        let tryConnectGatewayStub;
        beforeEach(() => {
            tryConnectGatewayStub = sinon.stub(testFactory, 'tryConnectGateway');
            gatewayHelper.gateway = {
                disconnect: sinon.spy(),
            };
        });
        afterEach(() => {
            testFactory.tryConnectGateway.restore();
        });
        it('should fail', async () => {
            const error = new Error('Some error');
            gatewayHelper.contract = {
                evaluateTransaction: sinon.stub()
                    .onCall(0)
                    .throws(error),
            };
            try {
                await blockchainHelper.queryLedger({ args: [] });
            } catch (e) {
                assert.exception(e);
                expect(e.message).to.equal('Error querying ledger: Some error');
                expect(gatewayHelper.contract.evaluateTransaction.callCount).to.equal(1);
            }
        });
        it('should fail two times', async () => {
            const error = new Error('Some error');
            const accessError = new Error('access denied');
            gatewayHelper.contract = {
                evaluateTransaction: sinon.stub()
                    .onCall(0) // onFirstCall()
                    .throws(accessError)
                    .onCall(1) // onSecondCall()
                    .throws(error),
            };
            try {
                await blockchainHelper.queryLedger({ args: [] });
            } catch (e) {
                assert.exception(e);
                expect(e.message).to.equal('Error re-enrolling admin user: Error: Some error');
                expect(gatewayHelper.contract.evaluateTransaction.callCount).to.equal(2);
                expect(tryConnectGatewayStub.callCount).to.equal(1);
                expect(gatewayHelper.gateway.disconnect.callCount).to.equal(1);
            }
        });
        it('should work', async () => {
            const accessError = new Error('access denied');
            gatewayHelper.contract = {
                evaluateTransaction: sinon.stub()
                    .onCall(0) // onFirstCall()
                    .throws(accessError),
            };
            try {
                await blockchainHelper.queryLedger({ args: [] });
            } catch (e) {
                assert.exception(e);
                expect(e.message).to.equal('Error re-enrolling admin user: Error: Some error');
                expect(gatewayHelper.contract.evaluateTransaction.callCount).to.equal(2);
                expect(tryConnectGatewayStub.callCount).to.equal(1);
                expect(gatewayHelper.gateway.disconnect.callCount).to.equal(1);
            }
        });
        it('should work', async () => {
            gatewayHelper.contract = {
                evaluateTransaction: sinon.spy(),
            };
            await blockchainHelper.queryLedger({ args: [] });
            expect(gatewayHelper.contract.evaluateTransaction.callCount).to.equal(1);
            expect(tryConnectGatewayStub.callCount).to.equal(0);
            expect(gatewayHelper.gateway.disconnect.callCount).to.equal(0);
        });
    });

    describe('invokeLedger()', () => {
        it('should fail', async () => {
            const error = new Error('Some error');
            gatewayHelper.contract = {
                submitTransaction: sinon.stub()
                    .onCall(0)
                    .throws(error),
            };
            try {
                await blockchainHelper.invokeLedger({ args: [] });
            } catch (e) {
                assert.exception(e);
                expect(e.message).to.equal('Error invoking ledger: Error: Some error');
                expect(gatewayHelper.contract.submitTransaction.callCount).to.equal(1);
            }
        });
        it('should work', async () => {
            gatewayHelper.contract = {
                submitTransaction: sinon.stub(),
            };
            await blockchainHelper.invokeLedger({ args: [] });
            expect(gatewayHelper.contract.submitTransaction.callCount).to.equal(1);
        });
    });

    describe('tryConnectGateway()', () => {
        const sandbox = sinon.createSandbox();
        beforeEach(() => {
            sandbox.spy(utils);
        });
        afterEach(() => {
            sandbox.restore();
        });
        it('should work', async () => {
            await testFactory.tryConnectGateway();
            await testFactory.tryConnectGateway();

            expect(utils.getChannelName.callCount).to.equal(1);
            expect(utils.getChaincodeName.callCount).to.equal(1);
            expect(utils.getAdminID.callCount).to.equal(3);
            expect(utils.getDiscovery.callCount).to.equal(1);
            expect(utils.getConnProfile.callCount).to.equal(1);
        });
        it('should fail', async () => {
            const error = new Error('Some error');
            const getAdminWalletStub = sinon.stub(testFactory, 'getAdminWallet')
                .onCall(0) // onFirstCall()
                .throws(error);
            try {
                await testFactory.tryConnectGateway();
            } catch (e) {
                assert.exception(e);
                expect(e.message).to.equal('Some error');
                expect(getAdminWalletStub.callCount).to.equal(1);
                expect(utils.getChannelName.callCount).to.equal(1);
                expect(utils.getChaincodeName.callCount).to.equal(1);
                expect(utils.getAdminID.callCount).to.equal(1);
                expect(utils.getDiscovery.callCount).to.equal(1);
                expect(utils.getConnProfile.callCount).to.equal(1);
            }
            testFactory.getAdminWallet.restore();
        });
    });

    describe('getAdminWallet()', () => {
        afterEach(() => {
            testFactory.getAdminKey.restore();
            testFactory.getWalletFromAdminKey.restore();
        });
        it('should fail', async () => {
            const error = new Error('Some error');
            const getWalletFromAdminKeyStub = sinon.stub(testFactory, 'getWalletFromAdminKey');
            const getAdminKeyStub = sinon.stub(testFactory, 'getAdminKey')
                .onCall(0)
                .throws(error);
            try {
                await testFactory.getAdminWallet();
            } catch (e) {
                assert.exception(e);
                expect(e.message).to.equal('Some error');
                expect(getAdminKeyStub.callCount).to.equal(1);
                expect(getWalletFromAdminKeyStub.callCount).to.equal(0);
            }
        });
        it('should fail', async () => {
            const error = new Error('Some error');
            const getAdminKeyStub = sinon.stub(testFactory, 'getAdminKey');
            const getWalletFromAdminKeyStub = sinon.stub(testFactory, 'getWalletFromAdminKey')
                .onCall(0)
                .throws(error);
            try {
                await testFactory.getAdminWallet();
            } catch (e) {
                assert.exception(e);
                expect(e.message).to.equal('Some error');
                expect(getAdminKeyStub.callCount).to.equal(1);
                expect(getWalletFromAdminKeyStub.callCount).to.equal(1);
            }
        });
        it('should fail with Wallets error', async () => {
            const error = new Error('Some error');
            const getAdminKeyStub = sinon.stub(testFactory, 'getAdminKey');
            const getWalletFromAdminKeyStub = sinon.stub(testFactory, 'getWalletFromAdminKey');
            const newInMemoryWalletStub = sinon.stub(Wallets, 'newInMemoryWallet')
                .onCall(0)
                .throws(error);
            try {
                await testFactory.getAdminWallet();
            } catch (e) {
                assert.exception(e);
                expect(e.message).to.equal('Some error');
                expect(getAdminKeyStub.callCount).to.equal(1);
                expect(getWalletFromAdminKeyStub.callCount).to.equal(1);
                expect(newInMemoryWalletStub.callCount).to.equal(1);
            }
        });
        it('should work', async () => {
            const getAdminKeyStub = sinon.stub(testFactory, 'getAdminKey');
            const getWalletFromAdminKeyStub = sinon.stub(testFactory, 'getWalletFromAdminKey');
            await testFactory.getAdminWallet();
            expect(getAdminKeyStub.callCount).to.equal(1);
            expect(getWalletFromAdminKeyStub.callCount).to.equal(1);
        });
        it('should work', async () => {
            const getAdminKeyStub = sinon.stub(testFactory, 'getAdminKey');
            const getWalletFromAdminKeyStub = sinon.stub(testFactory, 'getWalletFromAdminKey');
            await testFactory.getAdminWallet(true);
            expect(getAdminKeyStub.callCount).to.equal(1);
            expect(getWalletFromAdminKeyStub.callCount).to.equal(1);
        });
    });
});
