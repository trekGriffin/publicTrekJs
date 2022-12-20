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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const c_str_1 = __importDefault(require("./c_str"));
const child_process_1 = require("child_process");
const os_1 = __importDefault(require("os"));
const nodemailer_1 = __importDefault(require("nodemailer"));
class c_downloader {
    constructor() {
        this.proxyInfo = "";
    }
    /**
     * curl won't ensure the output file is valid.
     * for example: a 404 status also write to a file and return code 0.
     */
    curlworker(info) {
        const cmd = "curl";
        const options = [
            "-s",
            "--proxy",
            this.proxyInfo,
            info.url,
            "-o",
            info.fullPath,
        ];
        return c_tools.worker(cmd, options);
    }
    m3uworker(info) {
        if (!process.env.ffmpeg) {
            return Promise.reject("youtube bin env not found");
        }
        const cmd = process.env.ffmpeg;
        if (!fs_1.default.existsSync(cmd)) {
            return Promise.reject([cmd, "not exist?"].join(" "));
        }
        const options = [
            "-http_proxy",
            this.proxyInfo,
            "-i",
            info.url,
            "-c",
            "copy",
            info.fullPath,
        ];
        return c_tools.worker(cmd, options);
    }
    /**
     *
     * @returns youtube job
     */
    ytworker(info) {
        if (!process.env.youtube) {
            return Promise.reject("youtube bin env not found");
        }
        const cmd = process.env.youtube;
        if (!fs_1.default.existsSync(cmd)) {
            return Promise.reject([cmd, "not exist?"].join(" "));
        }
        // '--write-thumbnail',
        const options = [
            "-o",
            info.fullPath,
            "--proxy",
            this.proxyInfo,
            "--merge-output-format",
            "mp4",
            info.url,
        ];
        return c_tools.worker(cmd, options);
    }
    /**
   * youtube music 9xbuddy work job
   */
    musicWorker(info) {
        return __awaiter(this, void 0, void 0, function* () {
            const browser = yield puppeteer_1.default.launch({
                args: ["--proxy-server=" + this.proxyInfo],
                headless: false,
            });
            try {
                const url_9xbuddy = "https://offmp3.com/process?url=";
                const dlsite = url_9xbuddy + info.url;
                const page = yield browser.newPage();
                page.on('console', msg => console.log('PAGE LOG:', msg.text()));
                yield page.goto(dlsite, {
                    waitUntil: "networkidle2",
                });
                //config browser download behavior
                const client = yield page.target().createCDPSession();
                let downloadPath = '';
                if (os_1.default.platform() == 'linux') {
                    downloadPath = path_1.default.dirname(info.fullPath).replace(/\\/g, "/");
                }
                else {
                    downloadPath = path_1.default
                        .dirname(info.fullPath)
                        .replace(/\//g, "\\");
                }
                c_str_1.default.blue("the download path is ", downloadPath, 'os is ', os_1.default.platform());
                yield client.send("Page.setDownloadBehavior", {
                    behavior: "allow",
                    //caveat: have to be "d:\ab\cd\ef", because it's windows.
                    downloadPath: downloadPath,
                });
                console.log('finding the dom');
                yield page.waitForSelector("a[class='mx-2 no-underline text-green-500 hover:underline']", { timeout: 10000 });
                console.log('got the dom');
                //download action
                yield page.waitForFunction(() => {
                    let wantedVideoLink = undefined;
                    console.log("finding the link...");
                    let arr = document.getElementsByTagName("a");
                    wantedVideoLink = Array.from(arr).find((ele) => ele.href.includes("/audio/"));
                    console.log('find result', wantedVideoLink === null || wantedVideoLink === void 0 ? void 0 : wantedVideoLink.href);
                    //@ts-ignore
                    wantedVideoLink.click();
                    return true;
                }, { polling: 1000, timeout: 1 * 8 * 1000 });
                //start frontend monitor...
                const dlManager = yield browser.newPage();
                // Note: navigating to this page only works in headful chrome.
                yield dlManager.goto("chrome://downloads/");
                console.log("chrome start downloading, see the front log...");
                // Wait for our download to show up in the list by matching on its url.
                let jsHandle = yield dlManager.waitForFunction(() => {
                    const manager = document.querySelector("downloads-manager");
                    // const downloads = manager.items_.length;
                    const lastDownload = manager.items_[0];
                    if (!lastDownload) {
                        throw "cannot find the download manager ";
                    }
                    switch (lastDownload.state) {
                        case "IN_PROGRESS": {
                            console.log("polling...", Date.now(), lastDownload);
                            break;
                        }
                        case "COMPLETE": {
                            return manager.items_[0];
                        }
                        case "INTERRUPTED": {
                            throw "download interrupted";
                        }
                    }
                    //s,m,h,ms
                }, { polling: 3000, timeout: 10 * 60 * 60 * 1000 });
                //fileMeta.filePath holds the full path
                const fileMeta = yield jsHandle.jsonValue();
                const size = fs_1.default.statSync(fileMeta.filePath).size;
                console.log("download is over, checking size", size);
                if (size < 1024 * 1024) {
                    throw "file size is less than 1MB, and i deleted it.size:" + size;
                }
                console.log([
                    "size ok, renaming from",
                    fileMeta.filePath,
                    "to",
                    info.fullPath,
                ].join(" "));
                fs_1.default.renameSync(fileMeta.filePath, info.fullPath);
                yield browser.close();
            }
            catch (e) {
                c_str_1.default.red("puppeteer catched error, closing the browser", e);
                yield browser.close();
                throw e;
            }
        });
    }
    /**
     * buddy work job
     */
    buddyworker(info) {
        return __awaiter(this, void 0, void 0, function* () {
            const browser = yield puppeteer_1.default.launch({
                //const proxy="--proxy-server=127.0.0.1:8889"
                args: ["--proxy-server=" + this.proxyInfo],
                headless: false,
            });
            try {
                const url_9xbuddy = "https://9xbuddy.com/process?url=";
                const dlsite = url_9xbuddy + info.url;
                const page = yield browser.newPage();
                page.on('console', msg => console.log('PAGE LOG:', msg.text()));
                yield page.goto(dlsite, {
                    waitUntil: "networkidle2",
                });
                //get the  download parent dom
                yield page.waitForSelector("div[class='w-1/2 sm:w-1/3 lg:w-1/2 truncate']", { timeout: 10000 });
                console.log('got the dom');
                //config browser download behavior
                const client = yield page.target().createCDPSession();
                let downloadPath = '';
                if (os_1.default.platform() == 'linux') {
                    downloadPath = path_1.default.dirname(info.fullPath).replace(/\\/g, "/");
                }
                else {
                    downloadPath = path_1.default
                        .dirname(info.fullPath)
                        .replace(/\//g, "\\");
                }
                c_str_1.default.blue("the download path is ", downloadPath, 'os is ', os_1.default.platform());
                yield client.send("Page.setDownloadBehavior", {
                    behavior: "allow",
                    //caveat: have to be "d:\ab\cd\ef", because it's windows.
                    downloadPath: downloadPath,
                });
                //download action
                yield page.waitForFunction(() => {
                    let arr = document.getElementsByTagName("a");
                    let wantedVideoLink;
                    wantedVideoLink = Array.from(arr).find((ele) => ele.href.includes("+720P"));
                    if (!wantedVideoLink) {
                        wantedVideoLink = Array.from(arr).find((ele) => ele.href.includes("_720"));
                    }
                    if (!wantedVideoLink) {
                        wantedVideoLink = Array.from(arr).find((ele) => ele.href.includes("_480"));
                    }
                    console.log("checking the link...");
                    if (!wantedVideoLink) {
                        throw "not found any resolution file";
                    }
                    wantedVideoLink.click();
                    console.log("have clicked the download button...");
                    return true;
                }, { polling: 1000, timeout: 1 * 60 * 1000 });
                //start frontend monitor...
                const dlManager = yield browser.newPage();
                // Note: navigating to this page only works in headful chrome.
                yield dlManager.goto("chrome://downloads/");
                console.log("chrome start downloading, see the front log...");
                // Wait for our download to show up in the list by matching on its url.
                let jsHandle = yield dlManager.waitForFunction(() => {
                    const manager = document.querySelector("downloads-manager");
                    // const downloads = manager.items_.length;
                    const lastDownload = manager.items_[0];
                    if (!lastDownload) {
                        throw "cannot find the download manager ";
                    }
                    switch (lastDownload.state) {
                        case "IN_PROGRESS": {
                            console.log("polling...", Date.now(), lastDownload);
                            break;
                        }
                        case "COMPLETE": {
                            return manager.items_[0];
                        }
                        case "INTERRUPTED": {
                            throw "download interrupted";
                        }
                    }
                    //s,m,h,ms
                }, { polling: 30000, timeout: 60 * 60 * 6 * 1000 });
                //fileMeta.filePath holds the full path
                const fileMeta = yield jsHandle.jsonValue();
                const size = fs_1.default.statSync(fileMeta.filePath).size;
                console.log("download is over, checking size", size);
                if (size < 1024 * 1024) {
                    throw "file size is less than 1MB, and i deleted it.size:" + size;
                }
                console.log([
                    "size ok, renaming from",
                    fileMeta.filePath,
                    "to",
                    info.fullPath,
                ].join(" "));
                fs_1.default.renameSync(fileMeta.filePath, info.fullPath);
                yield browser.close();
            }
            catch (e) {
                c_str_1.default.red("puppeteer catched error, closing the browser", e);
                yield browser.close();
                throw e;
            }
        });
    }
    setProxy(proxy) {
        this.proxyInfo = proxy;
    }
    /**
     * you should love this.
     * @param info type is the info
     * @returns
     */
    download(info) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.proxyInfo) {
                    throw "empty proxy setting";
                }
                c_str_1.default.blue("got download request: env:", this.proxyInfo, JSON.stringify(info));
                let result;
                if (info.type == "curl") {
                    result = yield this.curlworker(info);
                }
                else if (info.type == "music") {
                    result = yield this.musicWorker(info);
                }
                else if (info.type == "youtube") {
                    result = yield this.ytworker(info);
                }
                else if (info.type == "m3u") {
                    result = yield this.m3uworker(info);
                }
                else if (info.type == "9xbuddy") {
                    result = yield this.buddyworker(info);
                }
                else {
                    throw [
                        "your type",
                        info.type,
                        "is not correct. you should use curl, youtube, 9xbuddy",
                    ].join(" ");
                }
                const requiredSize = 1000;
                const size = fs_1.default.lstatSync(info.fullPath).size;
                c_str_1.default.blue("the size is ", size, "b");
                if (size < 1000) {
                    let msg = ["downloaded file is less than ", requiredSize, "b"].join(" ");
                    c_str_1.default.red(msg);
                    throw msg;
                }
                if (info.needConvert) {
                    result = yield c_tools.convertMp4(info.fullPath);
                }
                return result;
            }
            catch (e) {
                throw e;
            }
        });
    }
}
class c_tools {
    static worker(command, options) {
        return new Promise((resolve, reject) => {
            const job = (0, child_process_1.spawn)(command, options);
            const temp = [command, options].join(" ");
            job.stderr.on("data", (chunk) => {
                c_str_1.default.green("stderr", temp, chunk.toString());
            });
            job.stdout.on("data", (chunk) => {
                c_str_1.default.green("stdout", temp, chunk.toString());
            });
            job.on("close", (code) => {
                let msg = command + " " + options.join(" ");
                if (code == 0) {
                    msg += " ok, code:" + code;
                    c_str_1.default.blue(msg);
                    resolve(msg);
                }
                else {
                    msg += " failed code " + code;
                    c_str_1.default.red(msg);
                    reject(msg);
                }
            });
        });
    }
    static convertMp4(location) {
        return new Promise((resolve, reject) => {
            if (!fs_1.default.existsSync(location)) {
                reject([location, "is not exist"].join(" "));
                return;
            }
            const currentFolder = path_1.default.dirname(location);
            const tempFileName = "convertTemp.mp4";
            const cmd = "ffmpeg";
            const tempPath = path_1.default.join(currentFolder, tempFileName);
            let options = ["-y", "-i", location, "-c", "copy", tempPath];
            this.worker(cmd, options)
                .then(() => {
                fs_1.default.renameSync(tempPath, location);
                resolve(["rename to", location, "ok, convert ok"]);
            })
                .catch((err) => {
                reject(err);
            });
        });
    }
    static lockWindows() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                let command = "rundll32.exe";
                //  let command = "rundll32.exe user32.dll,LockWorkStation";
                const job = (0, child_process_1.spawn)(command, ["user32.dll,LockWorkStation"]);
                job.on('close', (code) => {
                    if (code == 0) {
                        resolve('lock ok ');
                    }
                    else {
                        reject('lock failed code:' + code);
                    }
                });
            });
        });
    }
    static webToPng(url, fullPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!process.env.proxy) {
                throw "no proxy env set";
            }
            const browser = yield puppeteer_1.default.launch({
                //const proxy="--proxy-server=127.0.0.1:8889"
                args: ["--proxy-server=" + process.env.proxy],
                headless: true,
            });
            try {
                const page = yield browser.newPage();
                yield page.goto(url, {
                    waitUntil: "networkidle2",
                });
                yield page.screenshot({ path: fullPath, type: "png", fullPage: true });
                yield browser.close();
                return "screen shot ok";
            }
            catch (e) {
                c_str_1.default.red(e.toString());
                throw e;
            }
        });
    }
    static sendMail(recipient = "ilife008@qq.com", emailSubject = "no subject", emailContent = "no content") {
        const config = {
            email_address: process.env.email,
            email_password: process.env.email_password,
            email_recipient: "ilife008@qq.com",
            email_server: "smtp.189.cn",
            email_port: 465,
        };
        const transprter = nodemailer_1.default.createTransport({
            host: config.email_server,
            port: config.email_port,
            secure: true,
            auth: {
                user: config.email_address,
                pass: config.email_password, // generated ethereal password
            },
        });
        const mailOptions = {
            from: config.email_address,
            to: recipient,
            subject: emailSubject,
            html: emailContent,
        };
        transprter.sendMail(mailOptions, (error, info) => {
            console.log("email job is starting...");
            if (error) {
                console.log("trek email job error:", error);
            }
            else {
                console.log("trek email has been sent" + info.response);
            }
        });
    }
}
exports.default = c_tools;
c_tools.downloader = new c_downloader();
// module.exports = c_tools
