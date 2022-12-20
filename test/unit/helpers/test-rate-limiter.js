/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../../../app');
chai.use(chaiHttp);
const { expect } = chai;
const CloudantHelper = require('../../../db/cloudantDB');
const cryptography  = require('../../../helpers/encrypt-decrypt-helper');


process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

describe('forgot password api request call', function (req) {
    this.timeout(90000); 
    const encryptedEmail = cryptography.encrypt('test@test.com');
    it('should have empty response, it check for existing record', async() => {
        const dbName = 'cm-rate-limiter';
        cloudantClient = CloudantHelper.getInstance();
        const query = {
            email: { $eq: encryptedEmail }
        };
        const existingRecord = await cloudantClient.findByQuery(dbName, query);
        chai.expect(existingRecord).to.be.instanceof(Array);
        chai.expect(existingRecord).to.deep.equal([]);
          
    });

    it('Should return a 200, first forgot password request', (done) => {
        const path = '/simple-consent/api/v1/users/forgotPassword';
        const body = {
            userId: 'test@test.com'
        };
        chai
            .request(server)
            .post(path)
            .send(body)
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('Password email sent successfully');
                done();
            });
    });

    it('Should return a 429, if request forgot password with in 1 minute', (done) => {
        const path = '/simple-consent/api/v1/users/forgotPassword';
        const body = {
            userId: 'test@test.com'
        };
        chai
            .request(server)
            .post(path)
            .send(body)
            .end((err, res) => {
                expect(res).to.have.status(429);
                expect(res.body).to.have.property('error');
                expect(res.body.error.message).to.equal('Too many requests, try again after one minute');
                done();
            });
    });

    it('Should return a encrypted email- (invalid email format), if fetch record with in 1 minute', async() => {
        const dbName = 'cm-rate-limiter';
        cloudantClient = CloudantHelper.getInstance();
        const validEmailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
        const query = {
            email: { $eq: encryptedEmail }
        };
        const existingRecord = await cloudantClient.findByQuery(dbName, query);
        chai.expect(existingRecord).to.be.instanceof(Array);
        chai.expect(existingRecord[0].email).to.not.equal('test@test.com');
        chai.expect(existingRecord[0].email).to.not.match(validEmailRegex);
    });

    it('should have empty record  after one minute', (done) => {
        const dbName = 'cm-rate-limiter';
        setTimeout(async() => {
            cloudantClient = CloudantHelper.getInstance();
            const query = {
            email: { $eq: encryptedEmail }
            };
            const existingRecord = await cloudantClient.findByQuery(dbName, query);
            chai.expect(existingRecord).to.be.instanceof(Array);
            chai.expect(existingRecord).to.deep.equal([]);
            done();
        }, 60100);
    });

    it('Should return a 200, second forgot password request', (done) => {
        const path = '/simple-consent/api/v1/users/forgotPassword';
        const body = {
            userId: 'test@test.com'
        };
        chai
            .request(server)
            .post(path)
            .send(body)
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('msg');
                expect(res.body.msg).to.equal('Password email sent successfully');
                done();
            });
    });

    after('should delete record from cloudant db', async() => {
        cloudantClient = CloudantHelper.getInstance();
        const dbName = 'cm-rate-limiter';
        const dbPartitionKey = 'cm';
        const docId = `${dbPartitionKey}:${encryptedEmail}`;
        await cloudantClient.deleteDocument(dbName, docId);
        console.log('Document has been deleted successfully');
    })
});
process.env.NODE_ENV = 'test';
