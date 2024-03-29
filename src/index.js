import { createFFmpeg } from '@ffmpeg/ffmpeg';

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
    for (const resolution of [1080, 720, 480, 360, 270, 240, 220]) {
      const response = await fetch(`${baseUrl}/DASH_${resolution}.mp4`);
      if (response.status === 200) {
        await ffmpeg.FS('writeFile', 'video.mp4', new Uint8Array(await response.arrayBuffer()));
        return true;
      }
    }
    return false;
  })();

  const audioPromise = (async () => {
    for (const bitrateSuffix of ['audio', 'AUDIO_128', 'AUDIO_64']) {
      const response = await fetch(`${baseUrl}/DASH_${bitrateSuffix}.mp4`);
      if (response.status === 200) {
        await ffmpeg.FS('writeFile', 'audio.mp4', new Uint8Array(await response.arrayBuffer()));
        return true;
      }
    }
    return false;
  })();


  // fetch then write video and audio files simultaneously
  await Promise.allSettled([
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