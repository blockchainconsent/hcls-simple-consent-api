/*
 *
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 *
 */

"use strict";

const crypto = require("crypto");
const ENCODE_SCHEMA = 'base64';

class Cryptography {
    constructor() {
        this.initConfig = null;
    }

    _initConfiguration() {
        //Length should be 32 bit
        const secretKey = process.env.CRYPTO_SECRET_KEY;
        //Recommended length 16 bit
        const salt = process.env.CRYPTO_SALT;
        //Length should be 16 bit
        const iv = process.env.CRYPTO_IV;

        const keyBase64 = crypto.pbkdf2Sync(
            Buffer.from(secretKey, "utf8"),
            salt,
            65536,
            32,
            "sha512"
        );

        this.CRYPTO_ALGORITHM = "aes-256-cbc";
        this.keyBase64 = Buffer.from(keyBase64, ENCODE_SCHEMA);
        this.ivBase64 = Buffer.from(iv).toString(ENCODE_SCHEMA);

        return true;
    }

    //Function to encrypt plain text data
    encrypt(plainText) {
        plainText = plainText.toString();
        //check the instance of this class, create new if not
        if (!this.initConfig) {
            this.initConfig = this._initConfiguration();
        }
        //get key and iv from Buffer
        const key = Buffer.from(this.keyBase64, ENCODE_SCHEMA);
        const iv = Buffer.from(this.ivBase64, ENCODE_SCHEMA);

        const cipher = crypto.createCipheriv(this.CRYPTO_ALGORITHM, key, iv);
        let encrypted = cipher.update(plainText, "utf8", ENCODE_SCHEMA);
        encrypted += cipher.final(ENCODE_SCHEMA);
        return encrypted;
    }

    //Function to decrypt encrypted data
    decrypt(cipherText) {
        //check the instance of this class, create new if not
        if (!this.initConfig) {
            this.initConfig = this._initConfiguration();
        }
        //get key and iv from Buffer
        const key = Buffer.from(this.keyBase64, ENCODE_SCHEMA);
        const iv = Buffer.from(this.ivBase64, ENCODE_SCHEMA);

        const decipher = crypto.createDecipheriv(this.CRYPTO_ALGORITHM, key, iv);
        let decrypted = decipher.update(cipherText, ENCODE_SCHEMA);
        decrypted += decipher.final();
        return decrypted;
    }
}

module.exports =  new Cryptography();