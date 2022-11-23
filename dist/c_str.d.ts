export default class c_str {
    /**
  * return an array from a string like "xxx" "zzz" aaaa
  */
    static splitQuote(msg: string): string[];
    static checkJson(json: object, needed: string[]): string;
    static checkArrValue(...args: string[]): string;
    static jsonToKV(json: any): any[];
    static pathJoin(...args: string[]): string;
    static findEmptyJsonValue(json: any): string;
    static colors: {
        red: string;
        green: string;
        yellow: string;
        blue: string;
    };
    static getDateFull(): string;
    static getDateToday(): string;
    private static log;
    static red(...args: (string | number)[]): void;
    static green(...args: (string | number)[]): void;
    static yellow(...args: (string | number)[]): void;
    static blue(...args: (string | number)[]): void;
}
//# sourceMappingURL=c_str.d.ts.map