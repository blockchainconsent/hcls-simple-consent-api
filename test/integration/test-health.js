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

chai.use(chaiHttp);

const { expect } = chai;

const server = require('../../app');

describe('GET health', function getTest () {
    const path = '/simple-consent/api/v1/health';
    this.timeout(7000);

    it('should return 200 on success', (done) => {
        chai
            .request(server)
            .get(path)
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.have.property('message');
                expect(res.body.message).to.equal('Simple consent api health is OK');
                done();
            });
    });
});
