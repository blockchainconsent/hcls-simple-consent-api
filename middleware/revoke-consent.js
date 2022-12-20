/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

const addConsentOption = (req, res, next) => {
  req.body.ConsentOption = ['deny'];
  next();
};

module.exports = addConsentOption;
