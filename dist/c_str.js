"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const moment_1 = __importDefault(require("moment"));
class c_str {
    /**
  * return an array from a string like "xxx" "zzz" aaaa
  */
    static splitQuote(msg) {
        const b = msg.match(/"([^"]+)"|[^" ]+/g);
        if (b) {
            return b.map(ele => ele.replace(/\"/g, '').trim());
        }
        else {
            return [];
        }
    }
    static checkJson(json, needed) {
        let str = '';
        needed.forEach(ele => {
            // @ts-ignore
            if (!json[ele] || typeof json[ele] == "undefined") {
                str += ele + ',';
            }
        });
        return str;
    }
    static checkArrValue(...args) {
        let s = '';
        args.forEach(ele => {
            if (!ele) {
                s += ele + " is null ";
            }
        });
        return s;
    }
    static jsonToKV(json) {
        //aaaa
        let KV = [];
        Object.keys(json).forEach(key => {
            KV.push({ key, value: json[key] });
        });
        return KV;
    }
    static pathJoin(...args) {
        return args.join('/');
    }
    static findEmptyJsonValue(json) {
        let str = [];
        Object.keys(json).forEach(key => {
            if (!json[key]) {
                str.push(key);
            }
        });
        if (str) {
            return str.join(' ');
        }
        return '';
    }
    static getDateFull() {
        return "[" + (0, moment_1.default)(new Date()).format('YYYY-MM-DD HH:mm:ss') + "]";
    }
    static getDateToday() {
        return (0, moment_1.default)(new Date()).format('YYYY-MM-DD');
    }
    static log(color, ...args) {
        console.log(color, this.getDateFull() + ' ' + args.join(' '));
    }
    static red(...args) {
        this.log(this.colors.red, args.join(' '));
    }
    static green(...args) {
        this.log(this.colors.green, args.join(' '));
    }
    static yellow(...args) {
        this.log(this.colors.yellow, args.join(' '));
    }
    static blue(...args) {
        this.log(this.colors.blue, args.join(' '));
    }
}
exports.default = c_str;
c_str.colors = {
    red: "\x1b[31m%s\x1b[0m",
    green: "\x1b[32m%s\x1b[0m",
    yellow: "\x1b[33m%s\x1b[0m",
    blue: "\x1b[34m%s\x1b[0m",
};
//module.exports = c_str
