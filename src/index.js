import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

// assign ffmpeg to window.ffmpeg if it doesn't already exist
window.ffmpeg ??= createFFmpeg({
  mainName: 'main',
  log: true,
  corePath: 'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js',
});

(async () => {
  // load ffmpeg if it isn't already loaded
  window.ffmpeg.isLoaded() || await window.ffmpeg.load();

  // get the base url for the video and audio files
  const baseUrl = document.querySelector('.thumbnail')?.getAttribute('href');

  const videoPromise = (async () => {
    for (const c of [1080, 720, 480, 360, 240, 220]) {
      const dataUrl = `${baseUrl}/DASH_${c}.mp4`;
      const response = await fetch(dataUrl, {
        method: 'HEAD'
      });
      if (response.status === 200) {
        const file = await fetchFile(dataUrl);
        await ffmpeg.FS('writeFile', 'video.mp4', file);
        return true;
      }
    }
    return false;
  })();

  const audioPromise = (async () => {
    const audioUrl = `${baseUrl}/DASH_audio.mp4`;
    if ((await fetch(audioUrl, { method: 'HEAD' })).status === 200) {
      const file = await fetchFile(audioUrl);
      await ffmpeg.FS('writeFile', 'audio.mp4', file);
      return true;
    }
    return false
  })();

  // fetch then write video and audio files simultaneously
  await Promise.all([
    videoPromise,
    audioPromise
  ]);

  // either merge the video and audio, or just rename the video file if there is no audio
  if (await audioPromise) {
    await ffmpeg.run('-i', 'video.mp4', '-i', 'audio.mp4', '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0', 'output.mp4');
  } else {
    await ffmpeg.run('-i', 'video.mp4', '-c:v', 'copy', '-c:a', 'copy', '-map', '0:v:0', 'output.mp4');
  }

  // read the file into a buffer and exit ffmpeg
  const data = ffmpeg.FS('readFile', 'output.mp4');
  window.ffmpeg.exit();

  // download the file from the buffer
  const downloadLink = document.createElement('a');
  downloadLink.href = window.URL.createObjectURL(new Blob([data.buffer], {
    type: 'video/mp4'
  }));
  downloadLink.download = `${document.title}.mp4`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
})();