"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expiry = exports.hashingOptions = exports.roomRegex = exports.userRegex = exports.port = exports.jsDir = exports.frontendDir = exports.rootDir = void 0;
const argon2 = require('argon2');
const path = require('path');
exports.rootDir = path.resolve(__dirname + "/../../") + "/";
exports.frontendDir = path.resolve(__dirname + '/../../frontend/') + "/";
exports.jsDir = path.resolve(__dirname + '/../frontend/') + "/";
exports.port = 3000;
exports.userRegex = /^[0-9a-zA-Z_\\-]{1,20}$/;
exports.roomRegex = "[0-9a-zA-Z_\\-]{1,20}";
exports.hashingOptions = {
    type: argon2.argon2d,
    memoryCost: 12288,
    timeCost: 3,
    parallelism: 1,
    hashLength: 50
};
exports.expiry = [0, 1000 * 60 * 60 * 24, 1000 * 60 * 30, 1000 * 60 * 5];
//# sourceMappingURL=consts.js.map