import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import trekStr from "./c_str";
import { spawn } from "child_process";
import os from 'os'

/**
 * love this info?
 */
type Info = {
  url: string;
  fullPath: string;
  type: "curl" | "youtube" | "9xbuddy" | "m3u";
  needConvert: boolean;
};

class c_downloader {
  private downloading: boolean = false;
  private proxyInfo: string = "";
  private info: Info = {
    url: "",
    fullPath: "",
    type: "curl",
    needConvert: false,
  };
  /**
   * curl won't ensure the output file is valid.
   * for example: a 404 status also write to a file and return code 0.
   */
  private curlworker() {
    const cmd = "curl";
    const options: string[] = [
      "-s",
      "--proxy",
      this.proxyInfo,
      this.info.url,
      "-o",
      this.info.fullPath,
    ];
    return c_tools.worker(cmd, options);
  }

  private m3uworker() {
    if (!process.env.ffmpeg) {
      return Promise.reject("youtube bin env not found");
    }
    const cmd = process.env.ffmpeg;
    if (!fs.existsSync(cmd)) {
      return Promise.reject([cmd, "not exist?"].join(" "));
    }
    const options = [
      "-http_proxy",
      this.proxyInfo,
      "-i",
      this.info.url,
      "-c",
      "copy",
      this.info.fullPath,
    ];
    return c_tools.worker(cmd, options);
  }
  /**
   *
   * @returns youtube job
   */
  private ytworker() {
    if (!process.env.youtube) {
      return Promise.reject("youtube bin env not found");
    }
    const cmd = process.env.youtube;
    if (!fs.existsSync(cmd)) {
      return Promise.reject([cmd, "not exist?"].join(" "));
    }
    // '--write-thumbnail',
    const options = [
      "-o",
      this.info.fullPath,
      "--proxy",
      this.proxyInfo,
      "--merge-output-format",
      "mp4",
      this.info.url,
    ];
    return c_tools.worker(cmd, options);
  }
  /**
   * buddy work job
   */
  private async buddyworker() {
    const browser = await puppeteer.launch({
      //const proxy="--proxy-server=127.0.0.1:8889"
      args: ["--proxy-server=" + this.proxyInfo],
      headless: false,
    });
    try {
      const url_9xbuddy = "https://9xbuddy.com/process?url=";
      const dlsite = url_9xbuddy + this.info.url;
      const page = await browser.newPage();
      await page.goto(dlsite, {
        waitUntil: "networkidle2",
      });
      //get the  download parent dom
      await page.waitForSelector(
        "div[class='w-1/2 sm:w-1/3 lg:w-1/2 truncate']",
        { timeout: 10000 }
      );
      //config browser download behavior
      const client = await page.target().createCDPSession();
      let downloadPath=''
      if(os.platform()=='linux'){
        downloadPath=path.dirname(this.info.fullPath).replace(/\\/g, "/");
      }else{
        downloadPath = path
        .dirname(this.info.fullPath)
        .replace(/\//g, "\\");
      }
      trekStr.blue("the download path is ", downloadPath,'os is ',os.platform());
    
      await client.send("Page.setDownloadBehavior", {
        behavior: "allow",
        //caveat: have to be "d:\ab\cd\ef", because it's windows.
        downloadPath: downloadPath,
      });
      //download action
      await page.waitForFunction(
        () => {
          let arr = document.getElementsByTagName("a");
          let wantedVideoLink;

          wantedVideoLink = Array.from(arr).find((ele) =>
            ele.href.includes("+720P")
          );

          if (!wantedVideoLink) {
            wantedVideoLink = Array.from(arr).find((ele) =>
              ele.href.includes("_720")
            );
          }

          if (!wantedVideoLink) {
            wantedVideoLink = Array.from(arr).find((ele) =>
              ele.href.includes("_480")
            );
          }

          console.log("checking the link...");

          if (!wantedVideoLink) {
            throw "not found any resolution file";
          }
          wantedVideoLink.click();
          console.log("have clicked the download button...");

          return true;
        },
        { polling: 1000, timeout: 1 * 60 * 1000 }
      );
      //start frontend monitor...
      const dlManager = await browser.newPage();
      // Note: navigating to this page only works in headful chrome.
      await dlManager.goto("chrome://downloads/");
      console.log("chrome start downloading, see the front log...");
      // Wait for our download to show up in the list by matching on its url.
      let jsHandle = await dlManager.waitForFunction(
        () => {
          const manager = document.querySelector("downloads-manager") as any;
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
        },
        { polling: 30000, timeout: 60 * 60 * 6 * 1000 }
      );
      //fileMeta.filePath holds the full path
      const fileMeta = await jsHandle.jsonValue();
      const size = fs.statSync(fileMeta.filePath).size;
      console.log("download is over, checking size", size);
      if (size < 1024 * 1024) {
        throw "file size is less than 1MB, and i deleted it.size:" + size;
      }
      console.log(
        [
          "size ok, renaming from",
          fileMeta.filePath,
          "to",
          this.info.fullPath,
        ].join(" ")
      );
      fs.renameSync(fileMeta.filePath, this.info.fullPath);
      await browser.close();
      this.downloading = false;
    } catch (e: any) {
      trekStr.red("puppeteer catched error, closing the browser", e);
      await browser.close();
      this.downloading = false;
      throw e;
    }
  }
  setProxy(proxy: string) {
    this.proxyInfo = proxy;
  }

  getInfo() {
    return { status: this.downloading, info: this.info, proxy: this.proxyInfo };
  }

  setInfo(info: Info) {
    this.info = info;
    const tempPath = path.dirname(info.fullPath);
    fs.mkdirSync(tempPath, { recursive: true });
  }

  /**
   * you should love this.
   * @param info type is the info
   * @returns
   */
  async download(info?: Info) {
    try {
      if (!this.proxyInfo) {
        throw "empty proxy setting";
      }

      if (typeof info == "undefined" && !this.info) {
        throw "empty info set url,path..etc";
      } else {
        //@ts-ignore
        this.info = info;
      }
      //start download
      this.downloading = true;
      trekStr.blue(
        "got download request: env:",
        this.proxyInfo,
        JSON.stringify(this.info)
      );
      let result;
      if (this.info.type == "curl") {
        result = await this.curlworker();
      } else if (this.info.type == "youtube") {
        result = await this.ytworker();
      } else if (this.info.type == "m3u") {
        result = await this.m3uworker();
      } else if (this.info.type == "9xbuddy") {
        result = await this.buddyworker();
      } else {
        throw [
          "your type",
          this.info.type,
          "is not correct. you should use curl, youtube, 9xbuddy",
        ].join(" ");
      }
      const requiredSize = 1000;
      const size = fs.lstatSync(this.info.fullPath).size;
      trekStr.blue("the size is ", size, "b");
      if (size < 1000) {
        let msg = ["downloaded file is less than ", requiredSize, "b"].join(
          " "
        );
        trekStr.red(msg);
        this.downloading = false;
        throw msg;
      }
      if (this.info.needConvert) {
        result = await c_tools.convertMp4(this.info.fullPath);
      }
      this.downloading = false;
      return result;
    } catch (e: any) {
      this.downloading = false;
      throw e;
    }
  }
}

export default class c_tools {
  static downloader = new c_downloader();

  static worker(command: string, options: string[]) {
    return new Promise((resolve, reject) => {
      const job = spawn(command, options);
      const temp = [command, options].join(" ");
      job.stderr.on("data", (chunk: any) => {
        trekStr.green("stderr", temp, chunk.toString());
      });
      job.stdout.on("data", (chunk: any) => {
        trekStr.green("stdout", temp, chunk.toString());
      });
      job.on("close", (code: any) => {
        let msg = command + " " + options.join(" ");
        if (code == 0) {
          msg += " ok, code:" + code;
          trekStr.blue(msg);
          resolve(msg);
        } else {
          msg += " failed code " + code;
          trekStr.red(msg);
          reject(msg);
        }
      });
    });
  }
  static convertMp4(location: string) {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(location)) {
        reject([location, "is not exist"].join(" "));
        return;
      }
      const currentFolder = path.dirname(location);
      const tempFileName = "convertTemp.mp4";
      const cmd = "ffmpeg";
      const tempPath = path.join(currentFolder, tempFileName);
      let options = ["-y", "-i", location, "-c", "copy", tempPath];
      this.worker(cmd, options)
        .then(() => {
          fs.renameSync(tempPath, location);
          resolve(["rename to", location, "ok, convert ok"]);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
  static async lockWindows(){
    return new Promise((resolve,reject)=>{
    let command="rundll32.exe"
      //  let command = "rundll32.exe user32.dll,LockWorkStation";
      const job=  spawn(command,["user32.dll,LockWorkStation"])
      job.on('close',(code)=>{
       if(code==0){
         resolve('lock ok ')
       }else{
        reject('lock failed code:'+code)
       }
      })
    })
  }
  static async webToPng(url: string, fullPath: string) {
    if (!process.env.proxy) {
      throw "no proxy env set";
    }
    const browser = await puppeteer.launch({
      //const proxy="--proxy-server=127.0.0.1:8889"
      args: ["--proxy-server=" + process.env.proxy],
      headless: true,
    });
    try {
      const page = await browser.newPage();
      await page.goto(url, {
        waitUntil: "networkidle2",
      });
      await page.screenshot({ path: fullPath, type: "png", fullPage: true });
      await browser.close();
      return "screen shot ok";
    } catch (e: any) {
      trekStr.red(e.toString());
      throw e;
    }
  }
}

// module.exports = c_tools
