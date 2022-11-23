
import moment from 'moment'
export default class c_str {
  /**
* return an array from a string like "xxx" "zzz" aaaa
*/
  static splitQuote(msg: string) {
    const b = msg.match(/"([^"]+)"|[^" ]+/g)
    if (b) {
      return b.map(ele => ele.replace(/\"/g, '').trim())
    } else {
      return []
    }
  }
  static checkJson(json: object, needed: string[]) {
    let str = ''
    needed.forEach(ele => {
      // @ts-ignore
      if (!json[ele] || typeof json[ele] == "undefined") {
        str += ele + ','
      }
    })
    return str
  }
  static checkArrValue(...args:string[]){
    let s=''  
    args.forEach(ele=>{
        if(!ele){
          s+=ele+" is null "
        }
      })
      return s
  }

  static jsonToKV(json: any) {
    //aaaa
    let KV: any[] = []
    Object.keys(json).forEach(key => {
      KV.push({ key, value: json[key] })
    })
    return KV
  }
  static pathJoin(...args: string[]) {
    return args.join('/')
  }
  static findEmptyJsonValue(json: any) {
    let str: string[] = []
    Object.keys(json).forEach(key => {
      if (!json[key]) {
        str.push(key)
      }
    })
    if (str) {
      return str.join(' ')
    }
    return ''
  }
  static colors = {
    red: "\x1b[31m%s\x1b[0m",
    green: "\x1b[32m%s\x1b[0m",
    yellow: "\x1b[33m%s\x1b[0m",
    blue: "\x1b[34m%s\x1b[0m",
  }
  static getDateFull() {
    return "[" + moment(new Date()).format('YYYY-MM-DD HH:mm:ss') + "]"
  }
  static getDateToday() {
    return moment(new Date()).format('YYYY-MM-DD')
  }
  private static log(color: string, ...args: (string | number)[]) {
    console.log(color, this.getDateFull() + ' ' + args.join(' '));
  }
  static red(...args: (string | number)[]) {
    this.log(this.colors.red, args.join(' '));
  }
  static green(...args: (string | number)[]) {
    this.log(this.colors.green, args.join(' '));
  }
  static yellow(...args: (string | number)[]) {
    this.log(this.colors.yellow, args.join(' '));
  }
  static blue(...args: (string | number)[]) {
    this.log(this.colors.blue, args.join(' '));
  }

}


//module.exports = c_str
