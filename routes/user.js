/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const express = require('express');

const { login, validateEmail, resetPassword } = require('../controllers/user');
const requestLogger = require('../middleware/request-logger');
const { validateExistingUser } =  require('../helpers/app-id-helper');
const rateLimiter = require('../middleware/rate-limiter');

const router = express.Router();

router.post('/login', requestLogger, login);

router.post('/forgotPassword', requestLogger, validateEmail, validateExistingUser, rateLimiter, resetPassword);

module.exports = router;
