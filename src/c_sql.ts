import trekStr from './c_str'
import mysql, { Pool } from 'mysql'
type Info = {
  host: string,
  port: number,
  user: string,
  password: string,
  database: string,
  multipleStatements?: boolean,
  connectionLimit?: number,
  timezone?: string
}

export default class C_sql {
  private tag = {
    success: "[sql success]",
    fail: "[sql failed]"
  }
  private config: Info
  private pool: Pool
  private tableName: string = ''
  constructor(info: Info,tableName:string) {
    const tempStr = trekStr.findEmptyJsonValue(info)
    if (tempStr) {
      throw new Error("miss para" + tempStr)
    }
    this.config = info
    this.config.multipleStatements = true
    this.config.connectionLimit = 10
    // The timezone configured on the MySQL server. 
    //This is used to type cast server date/time values
    // to JavaScript Date object and vice versa. 
    //This can be 'local', 'Z', or a
    //n offset in the form +HH:MM or -HH:MM. (Default: 'local')
    this.config.timezone = "Z"

    this.pool = mysql.createPool(this.config)
    this.tableName=tableName
  }

 

  executeSql(sql: string):Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.pool.query(sql, (err: any, results: object[], fields: object[]) => {
        if (err) {
          reject(err)
          trekStr.yellow(this.tag.fail,sql)
          return;
        }
        trekStr.green(this.tag.success, sql);
        resolve(results)
      })
    })
  }
  async pagination(current: number, size: number, where: string | undefined):Promise<{records:Object[],totalPage:number}> {
    if (where) {
      where = "where " + where
    }
    let limitValue = (current - 1) * size;
    const sql = `select * from ${this.tableName} ${where}  limit ${limitValue},${size}`
    try{
      const records=await  this.executeSql(sql)
      const result=await this.executeSql(`select count(*) as totalPage from ${this.tableName} ${where} `)
      const totalPage=Math.ceil(result[0].totalPage/size)
      return {records,totalPage:totalPage}
    }catch(e){
      throw e
    }
   

    
  }
  randomOne() {
    const sql = `select * from ${this.tableName} order by rand() limit 1;`
    return this.executeSql(sql)
  }
  findJson(json:Object){
    const sql=`select * from ${this.tableName} where ${this.jsonToSql(json).join(' and ')} `
    return this.executeSql(sql)
  }
  findWhere(where:string) {
    const sql = `select * from ${this.tableName} where ${where}  `
    return this.executeSql(sql)
  } 
  update(json:object,whereJson:object){
    const sql=`update ${this.tableName} set ${this.jsonToSql(json)} where ${this.jsonToSql(whereJson)} `
    return this.executeSql(sql)
  }
  
  insert(json: object) {

    const sql = `insert into ${this.tableName} set   ${this.jsonToSql(json).join(',')} `
    return this.executeSql(sql)
  }

  private jsonToSql(json: object) {
    const result = trekStr.jsonToKV(json)
    let temp: string[] = []
    result.forEach((ele: any) => {
      temp.push(`${ele.key}="${ele.value}" `)
    })
    return temp
  }
  delete(json: object) {
    const temp = this.jsonToSql(json)
    let sql = `delete from ${this.tableName} where ` + temp.join(' and ')
    return this.executeSql(sql)
  }
}


// module.exports= C_sql