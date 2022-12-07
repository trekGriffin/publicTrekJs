/**
 * love this info?
 */
declare type Info = {
    url: string;
    fullPath: string;
    type: "curl" | "youtube" | "9xbuddy" | "m3u";
    needConvert: boolean;
};
declare class c_downloader {
    private downloading;
    private proxyInfo;
    private info;
    /**
     * curl won't ensure the output file is valid.
     * for example: a 404 status also write to a file and return code 0.
     */
    private curlworker;
    private m3uworker;
    /**
     *
     * @returns youtube job
     */
    private ytworker;
    /**
     * buddy work job
     */
    private buddyworker;
    setProxy(proxy: string): void;
    getInfo(): {
        status: boolean;
        info: Info;
        proxy: string;
    };
    setInfo(info: Info): void;
    /**
     * you should love this.
     * @param info type is the info
     * @returns
     */
    download(info?: Info): Promise<unknown>;
}
export default class c_tools {
    static downloader: c_downloader;
    static worker(command: string, options: string[]): Promise<unknown>;
    static convertMp4(location: string): Promise<unknown>;
    static lockWindows(): Promise<unknown>;
    static webToPng(url: string, fullPath: string): Promise<string>;
}
export {};
//# sourceMappingURL=c_tools.d.ts.map