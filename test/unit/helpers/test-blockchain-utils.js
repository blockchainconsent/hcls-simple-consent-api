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
const bcUtils = require('../../../helpers/blockchain-utils');
const config = require('../../../config').blockchain;

describe('blockchain-utils', () => {
    it('getChannelName() should return channelName from config', () => {
        const result = bcUtils.getChannelName();
        expect(result).to.equal(config.channelName);
    });
    it('getCAUrl() should return CAUrl from ibp profile', () => {
        const keys = Object.keys(config.connProfile.certificateAuthorities);
        const url = config.connProfile.certificateAuthorities[keys[0]].url;

        const result = bcUtils.getCAUrl();
        expect(result).to.equal(url);
    });
    it('getCAName() should return caName from ibp profile', () => {
        const keys = Object.keys(config.connProfile.certificateAuthorities);
        const caName = config.connProfile.certificateAuthorities[keys[0]].caName;

        const result = bcUtils.getCAName();
        expect(result).to.equal(caName);
    });
    it('getMSP() should return mspid from ibp profile', () => {
        const keys = Object.keys(config.connProfile.organizations);
        const mspid = config.connProfile.organizations[keys[0]].mspid;

        const result = bcUtils.getMSP();
        expect(result).to.equal(mspid);
    });
    it('getPeerUrl() should return peer url from ibp profile', () => {
        const keys = Object.keys(config.connProfile.peers);
        const url = config.connProfile.peers[keys[0]].url;

        const result = bcUtils.getPeerUrl();
        expect(result).to.equal(url);
    });
    it('getAdminID() should return adminID from config', () => {
        const result = bcUtils.getAdminID();
        expect(result).to.equal(config.admin);
    });
    it('getAdminSecret() should return adminSecret from environment variables', () => {
        const result = bcUtils.getAdminSecret();
        expect(result).to.equal(process.env.BC_ADMIN_SECRET);
    });
    it('getChaincodeName() should return adminID from config', () => {
        const result = bcUtils.getChaincodeName();
        expect(result).to.equal(config.chaincodeName);
    });
    it('getConnProfile() should return adminID from config', () => {
        const result = bcUtils.getConnProfile();
        expect(result).to.equal(config.connProfile);
    });
    it('getDiscovery() should return adminID from config', () => {
        const result = bcUtils.getDiscovery();
        expect(result).to.equal(config.gatewayDiscovery);
    });
});
