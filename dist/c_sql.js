"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const c_str_1 = __importDefault(require("./c_str"));
const mysql_1 = __importDefault(require("mysql"));
class C_sql {
    constructor(info, tableName) {
        this.tag = {
            success: "[sql success]",
            fail: "[sql failed]"
        };
        this.tableName = '';
        const tempStr = c_str_1.default.findEmptyJsonValue(info);
        if (tempStr) {
            throw new Error("miss para" + tempStr);
        }
        this.config = info;
        this.config.multipleStatements = true;
        this.config.connectionLimit = 10;
        // The timezone configured on the MySQL server. 
        //This is used to type cast server date/time values
        // to JavaScript Date object and vice versa. 
        //This can be 'local', 'Z', or a
        //n offset in the form +HH:MM or -HH:MM. (Default: 'local')
        this.config.timezone = "Z";
        this.pool = mysql_1.default.createPool(this.config);
        this.tableName = tableName;
    }
    executeSql(sql) {
        return new Promise((resolve, reject) => {
            this.pool.query(sql, (err, results, fields) => {
                if (err) {
                    reject(err);
                    c_str_1.default.yellow(this.tag.fail, sql);
                    return;
                }
                c_str_1.default.green(this.tag.success, sql);
                resolve(results);
            });
        });
    }
    pagination(current, size, where) {
        return __awaiter(this, void 0, void 0, function* () {
            if (where) {
                where = "where " + where;
            }
            let limitValue = (current - 1) * size;
            const sql = `select * from ${this.tableName} ${where}  limit ${limitValue},${size}`;
            try {
                const records = yield this.executeSql(sql);
                const result = yield this.executeSql(`select count(*) as totalPage from ${this.tableName} ${where} `);
                const totalPage = Math.ceil(result[0].totalPage / size);
                return { records, totalPage: totalPage };
            }
            catch (e) {
                throw e;
            }
        });
    }
    randomOne() {
        const sql = `select * from ${this.tableName} order by rand() limit 1;`;
        return this.executeSql(sql);
    }
    findJson(json) {
        const sql = `select * from ${this.tableName} where ${this.jsonToSql(json).join(' and ')} `;
        return this.executeSql(sql);
    }
    findWhere(where) {
        const sql = `select * from ${this.tableName} where ${where}  `;
        return this.executeSql(sql);
    }
    update(json, whereJson) {
        const sql = `update ${this.tableName} set ${this.jsonToSql(json)} where ${this.jsonToSql(whereJson)} `;
        return this.executeSql(sql);
    }
    insert(json) {
        const sql = `insert into ${this.tableName} set   ${this.jsonToSql(json).join(',')} `;
        return this.executeSql(sql);
    }
    jsonToSql(json) {
        const result = c_str_1.default.jsonToKV(json);
        let temp = [];
        result.forEach((ele) => {
            temp.push(`${ele.key}="${ele.value}" `);
        });
        return temp;
    }
    delete(json) {
        const temp = this.jsonToSql(json);
        let sql = `delete from ${this.tableName} where ` + temp.join(' and ');
        return this.executeSql(sql);
    }
}
exports.default = C_sql;
// module.exports= C_sql
