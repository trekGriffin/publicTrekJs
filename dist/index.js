"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tools = exports.sql = exports.str = void 0;
const c_str_1 = __importDefault(require("./c_str"));
exports.str = c_str_1.default;
const c_sql_1 = __importDefault(require("./c_sql"));
exports.sql = c_sql_1.default;
const c_tools_1 = __importDefault(require("./c_tools"));
exports.tools = c_tools_1.default;
const trek = {
    str: c_str_1.default, sql: c_sql_1.default, tools: c_tools_1.default
};
exports.default = trek;
