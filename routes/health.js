/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const express = require('express');

const healthController = require('../controllers/health');
const requestLogger = require('../middleware/request-logger');

const router = express.Router();

// health endpoint for liveness and readiness check
router.get('/', requestLogger, healthController.healthCheck);

module.exports = router;
