# reddit-dl-ffmpeg

Currently only works on 'old reddit', such using Reddit Enhancement Suite or old.reddit.com.

Contents of file `dist\index.js` in this repo can be copy and pasted into the console on a Reddit page with an .mp4 video such as https://www.reddit.com/r/aww/comments/12ujv9d/employee_of_the_month/ to download the video.

To use this more easily, save it as a boomarklet. Create a new bookmark, and and enter `javascript:` followed by pasting the entire script as the url target. This allows you to simply open a reddit page and click on the bookmark to download the video.

![chrome_9XB0J6E8he](https://user-images.githubusercontent.com/102277225/233794262-1da64589-5480-4438-9590-874bb12805ce.png)


Build your own script with `yarn parcel build src/index.js`, then the output will be in `dist\index.js`.

This project essentially just gets the separate video and audio files that Reddit uses to play a video, and packages them into the same video container with [ffmpeg-wasm](https://github.com/ffmpegwasm/ffmpeg.wasm).

Thanks to https://github.com/Unnoen for helping with getting ffmpeg bundled and running in the browser.
