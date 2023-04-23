# reddit-dl-ffmpeg

Currently only works on 'old reddit', such using Reddit Enhancement Suite or old.reddit.com.

Contents of file `dist\index.js` in this repo can be copy and pasted into the console on a Reddit page with an .mp4 video such as https://www.reddit.com/r/aww/comments/12ujv9d/employee_of_the_month/ to download the video.

You can also use this script more easily by using it as a bookmarklet, just enter `javascript:` followed by pasting the script as the target for a bookmark, then simply click the bookmark while on a reddit page with a video.

![chrome_9XB0J6E8he](https://user-images.githubusercontent.com/102277225/233794262-1da64589-5480-4438-9590-874bb12805ce.png)


Build your own file with `yarn parcel build src/index.js`, then the output will be in `dist\index.js`.

This project essentially just gets the separate video and audio files that Reddit uses to play a video, and packages them into the same video container with [ffmpeg-wasm](https://github.com/ffmpegwasm/ffmpeg.wasm).

Thanks to https://github.com/Unnoen for helping with getting ffmpeg bundled and running in the browser.
