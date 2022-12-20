# update
2022.91219.91649
* optimize the music download logic:
need to first wait for the dom, then click, then download...
* optimize the download logic
delete the context of the download process, only rememeber the passed the argument, not the instance.

2022.91219.91129
export type
forgot to npm build to update the latest info.

2022.91219.91046
add download music func
set puppeteer dependency update to date


# how to use
set the env in your project
```
PROXY="http://proxy.xxx.top:7890"
youtube=D:\xxx\bin\yt-dlp.exe
ffmpeg=D:\xxx\bin\ffmpeg.exe
# for database
db_friday={"host":"127.0.0.1","port":"3360","user":"root","password":"xxxx","database":"xxxx"}
email="xxxx@189.cn"
email_password="xxxx"
```