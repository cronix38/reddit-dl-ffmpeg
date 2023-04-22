import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

window.ffmpeg ??= createFFmpeg({
    mainName: 'main',
    log: true,
    corePath: 'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js',
});

(async () => {
    window.ffmpeg.isLoaded() || await window.ffmpeg.load();
    
    const baseUrl = document.getElementsByClassName('thumbnail')[0].getAttribute('href');
    const cases = [1080, 720, 480, 360, 240, 220];
    const audioUrl = `${baseUrl}/DASH_audio.mp4`;
    let videoUrl = '';
    for (const c in cases) {
        const response = await fetch(`${baseUrl}/DASH_${cases[c]}.mp4`, {
            method: 'HEAD'
          });
        if (response.status != 200) {continue;}
        videoUrl = `${baseUrl}/DASH_${cases[c]}.mp4`;
        break;
    }

    ffmpeg.FS('writeFile', 'video.mp4', await fetchFile(videoUrl));
    ffmpeg.FS('writeFile', 'audio.mp4', await fetchFile(audioUrl));
    await ffmpeg.run('-i', 'video.mp4', '-i', 'audio.mp4', '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0', 'output.mp4');
    const data = ffmpeg.FS('readFile', 'output.mp4');
    ffmpeg.FS('unlink', 'video.mp4');
    ffmpeg.FS('unlink', 'audio.mp4');
    window.ffmpeg.exit();

    const downloadLink = document.createElement('a');
    downloadLink.href = window.URL.createObjectURL(new Blob([data.buffer], {
      type: 'video/mp4'
    }));
    downloadLink.download = document.title;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  })();

  import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';