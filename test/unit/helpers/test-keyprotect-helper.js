/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

require('dotenv').config();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const { expect } = require('chai');

const config = require('../../test-config');
const { helperKeyProtect } = require('hcls-common');

const seqNum = Math.floor(Math.random() * 1000);
const keyName = `unit-test-key-${seqNum}`;

// eslint-disable-next-line max-lines-per-function
describe('keyprotect-helper', function keyProtectTests() {
    this.timeout(30000);
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
    describe('createKey()', () => {
        let keyID = '';

        after(async () => {
            await helperKeyProtect.deleteKey(keyID);

            const keyPayload = await helperKeyProtect.getNewestKeyByName(keyName);
            expect(keyPayload).deep.equal('');
        });

        describe('invalid', () => {
            it('missing payload', async () => {
                await expect(helperKeyProtect.createKey(keyName))
                    .to.be.rejectedWith('keyPayload is empty');

                const keyPayload = await helperKeyProtect.getNewestKeyByName(keyName);
                expect(keyPayload).deep.equal('');
            });
        });

        describe('valid', () => {

            it('empty payload', async () => {
                keyID = await helperKeyProtect.createKey(keyName, {});

                let keyPayload = await helperKeyProtect.getNewestKeyByName(keyName);
                expect(keyPayload).deep.equal({});

                keyPayload = await helperKeyProtect.getKeyByID(keyID);
                expect(keyPayload).deep.equal({});
            });

            it('non-empty payload with the same key name', async () => {
                const expectedPayload = {
                    public: '',
                    private_key: ''
                };
                const currentKeyID = await helperKeyProtect.createKey(keyName, expectedPayload);

                // ensure old key id was deleted during new key id createKey
                let keyPayload = await helperKeyProtect.getKeyByID(keyID);
                expect(keyPayload).deep.equal('');

                // check current key id
                keyPayload = await helperKeyProtect.getNewestKeyByName(keyName);
                expect(keyPayload).deep.equal(expectedPayload);

                keyPayload = await helperKeyProtect.getKeyByID(currentKeyID);
                expect(keyPayload).deep.equal(expectedPayload);

                keyID = currentKeyID;
            });
        });
    });

    describe('getNewestKeyByName()', () => {
        let keyID = '';
        const expectedKeyPayload = {
            public: 'public',
            private_key: 'private_key'
        };

        before (async () => {
            keyID = await helperKeyProtect.createKey(keyName, expectedKeyPayload);
        });

        after(async () => {
            await helperKeyProtect.deleteKey(keyID);

            const keyPayload = await helperKeyProtect.getNewestKeyByName(keyName);
            expect(keyPayload).deep.equal('');
        });

        describe('invalid', () => {
            it('non-existent keyName', async () => {
                const keyPayload = await helperKeyProtect.getNewestKeyByName('invalidKeyName');
                expect(keyPayload).deep.equal('');
            });
        });

        describe('valid', () => {
            it('1 key with keyName', async () => {
                const keyPayload = await helperKeyProtect.getNewestKeyByName(keyName);
                expect(keyPayload).deep.equal(expectedKeyPayload);
            });

            it('2 keys created with keyName', async () => {
                const newerExpectedKeyPayload = {
                    public: 'newer',
                    private_key: 'newer'
                };

                keyID = await helperKeyProtect.createKey(keyName, newerExpectedKeyPayload);

                const keyPayload = await helperKeyProtect.getNewestKeyByName(keyName);
                expect(keyPayload).deep.equal(newerExpectedKeyPayload);
            });
        });
    });

    describe('deleteKey', () => {
        let keyIDToDeleteNow = '';
        let keyIDToDeleteLater = '';

        before (async () => {
            // create and delete key for delete-twice test
            keyIDToDeleteNow = await helperKeyProtect.createKey('keyToDeleteNow', {});
            await helperKeyProtect.deleteKey(keyIDToDeleteNow);

            // create key for valid delete test
            keyIDToDeleteLater = await helperKeyProtect.createKey('keyToDeleteLater', {});
        });

        describe('invalid', () => {
            it('attempt to delete non-existent keyID', async () => {
                await expect(helperKeyProtect.deleteKey('invalidKeyID'))
                    .to.be.rejectedWith('Failed to delete key invalidKeyID in KeyProtect');
            });

            it('attempt to delete key that was already deleted', async () => {
                await expect(helperKeyProtect.deleteKey(keyIDToDeleteNow))
                    .to.be.rejectedWith('Key has already been deleted');
            });
        });

        describe('valid', () => {

            it('delete existing key', async () => {
                let keyPayload = await helperKeyProtect.getNewestKeyByName('keyToDeleteLater');
                expect(keyPayload).deep.equal({});

                await helperKeyProtect.deleteKey(keyIDToDeleteLater);

                keyPayload = await helperKeyProtect.getNewestKeyByName('keyToDeleteLater');
                expect(keyPayload).deep.equal('');
            });
        });
    });
});
