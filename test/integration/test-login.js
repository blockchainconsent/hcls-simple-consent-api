/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const atob = require('atob');
const chai = require('chai');
const chaiHttp = require('chai-http');
const { helperAppID } = require('hcls-common');

const { APPID_USER } = require('../constants');
const server = require('../../app');
const config = require('../test-config');

chai.use(chaiHttp);

const { expect } = chai;

describe('Exist User Check', function () {
    this.timeout(20000);
    before(async () => {
        const appIDDataObj = {
            url: config.url,
            tenantID: config.tenantID,
            userTenantID: APPID_USER.TENANT_ID,
            userName: APPID_USER.USER_NAME,
            clientID: config.clientID,
            secret: config.secret,
            apikey: config.apikey
        };
        helperAppID.setConfig(appIDDataObj);
        await helperAppID.existUserCheck(config.username, config.password);

        const appIDDataObj2 = {
            url: config.url,
            tenantID: config.tenantID,
            userTenantID: APPID_USER.INVALID_TENANT_ID,
            userName: APPID_USER.USER_NAME,
            clientID: config.clientID,
            secret: config.secret,
            apikey: config.apikey
        };
        helperAppID.setConfig(appIDDataObj2);
        await helperAppID.existUserCheck(config.username2, config.password2);
    });

    // eslint-disable-next-line max-lines-per-function
    describe('Invalid Login', function invalidLoginTest() {
        this.timeout(5000); // increase timeout for AppID login

        it('Should return a 400, missing login field', (done) => {
            const path = '/simple-consent/api/v1/users/login';
            const body = {
                email: 'cmadmin@poc.com',
                password: ''
            };
            chai
                .request(server)
                .post(path)
                .send(body)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('error');
                    expect(res.body.error).to.have.property('message');
                    expect(res.body.error.message).to.equal('Missing required login fields');
                    done();
                });
        });

        it('Should return a 400, invalid email field', (done) => {
            const path = '/simple-consent/api/v1/users/login';
            const body = {
                email: 'invalid-email',
                password: 'Testing123*'
            };
            chai
                .request(server)
                .post(path)
                .send(body)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('error');
                    expect(res.body.error).to.have.property('message');
                    expect(res.body.error.message).to.equal('email format is invalid');
                    done();
                });
        });

        it('Should return a 400, invalid user with AppID auth', (done) => {
            const path = '/simple-consent/api/v1/users/login';
            const body = {
                email: 'invalid@poc.com',
                password: 'invalid'
            };
            chai
                .request(server)
                .post(path)
                .send(body)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('error');
                    expect(res.body.error).to.have.property('message');
                    expect(res.body.error.message).to.include('The email or password that you entered is incorrect');
                    done();
                });
        });

        it('Should return a 400, wrong password', (done) => {

            const path = '/simple-consent/api/v1/users/login';
            const body = {
                email: 'cmadmin@poc.com',
                password: 'wrong'
            };
            chai
                .request(server)
                .post(path)
                .send(body)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('error');
                    expect(res.body.error).to.have.property('message');
                    expect(res.body.error.message).to.include('The email or password that you entered is incorrect');
                    done();
                });
        });

        it('Should return a 400, invalid field names', (done) => {
            const path = '/simple-consent/api/v1/users/login';
            const body = {
                email: config.username,
                password: config.password,
                is_admin: true,
                is_sso: true,
                role: 'admin',
            };
            chai
                .request(server)
                .post(path)
                .send(body)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body).to.have.property('error');
                    expect(res.body.error).to.have.property('message');
                    expect(res.body.error.message).to.include('Unexpected fields in request body: is_admin,is_sso,role');
                    done();
                });
        });
    });

    describe('Valid Login', function validLoginTest() {
        this.timeout(5000); // increase timeout for AppID login

        it('Should return a 200, valid user', (done) => {
            const path = '/simple-consent/api/v1/users/login';
            const body = {
                email: config.username,
                password: config.password
            };
            chai
                .request(server)
                .post(path)
                .send(body)
                .end((err, res) => {
                    if (err) throw err;
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('access_token');
                    // eslint-disable-next-line no-unused-expressions
                    expect(res.body.access_token).to.not.be.empty;
                    config.token = res.body.access_token;

                    const encodedPayload = config.token.split('.')[1];
                    const payload = JSON.parse(atob(encodedPayload));
                    const { TenantID } = payload;
                    config.tenantID = TenantID;

                    done();
                });
        });

        it('Should return a 200, valid user with invalid TenantID', (done) => {
            const path = '/simple-consent/api/v1/users/login';
            const body = {
                email: config.username2,
                password: config.password2
            };
            chai
                .request(server)
                .post(path)
                .send(body)
                .end((err, res) => {
                    if (err) throw err;
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('access_token');
                    expect(res.body.access_token).to.not.be.empty;
                    config.token2 = res.body.access_token;
                    done();
                });
        });
    });
});

process.env.NODE_ENV = 'test';
