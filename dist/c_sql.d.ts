declare type Info = {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    multipleStatements?: boolean;
    connectionLimit?: number;
    timezone?: string;
};
export default class C_sql {
    private tag;
    private config;
    private pool;
    private tableName;
    constructor(info: Info, tableName: string);
    executeSql(sql: string): Promise<any[]>;
    pagination(current: number, size: number, where: string | undefined): Promise<{
        records: Object[];
        totalPage: number;
    }>;
    randomOne(): Promise<any[]>;
    findJson(json: Object): Promise<any[]>;
    findWhere(where: string): Promise<any[]>;
    update(json: object, whereJson: object): Promise<any[]>;
    insert(json: object): Promise<any[]>;
    private jsonToSql;
    delete(json: object): Promise<any[]>;
}
export {};
//# sourceMappingURL=c_sql.d.ts.map