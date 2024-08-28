"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expiry = exports.roomRegex = exports.userRegex = exports.port = exports.jsDir = exports.frontendDir = exports.rootDir = void 0;
const path = require('path');
exports.rootDir = path.resolve(__dirname + "/../../") + "/";
exports.frontendDir = path.resolve(__dirname + '/../../frontend/') + "/";
exports.jsDir = path.resolve(__dirname + '/../frontend/') + "/";
exports.port = 3000;
exports.userRegex = /^[0-9a-zA-Z_\\-]{1,20}$/;
exports.roomRegex = "[0-9a-zA-Z_\\-]{1,20}";
exports.expiry = [0, 1000 * 60 * 60 * 24, 1000 * 60 * 30, 1000 * 60 * 5];
//# sourceMappingURL=consts.js.map