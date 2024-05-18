"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var consts_exports = {};
__export(consts_exports, {
  expiry: () => expiry,
  frontendDir: () => frontendDir,
  hashingOptions: () => hashingOptions,
  jsDir: () => jsDir,
  port: () => port,
  roomRegex: () => roomRegex,
  rootDir: () => rootDir,
  userRegex: () => userRegex
});
module.exports = __toCommonJS(consts_exports);
const argon2 = require("argon2");
const path = require("path");
const rootDir = path.resolve(__dirname + "/../../") + "/";
const frontendDir = path.resolve(__dirname + "/../../frontend/") + "/";
const jsDir = path.resolve(__dirname + "/../frontend/") + "/";
const port = 3e3;
const userRegex = /^[0-9a-zA-Z_\\-]{1,20}$/;
const roomRegex = "[0-9a-zA-Z_\\-]{1,20}";
const hashingOptions = {
  type: argon2.argon2d,
  memoryCost: 12288,
  timeCost: 3,
  parallelism: 1,
  hashLength: 50
};
const expiry = [0, 1e3 * 60 * 60 * 24, 1e3 * 60 * 30, 1e3 * 60 * 5];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  expiry,
  frontendDir,
  hashingOptions,
  jsDir,
  port,
  roomRegex,
  rootDir,
  userRegex
});
//# sourceMappingURL=consts.js.map
