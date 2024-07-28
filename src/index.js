import { createFFmpeg } from '@ffmpeg/ffmpeg';
import { Parser } from 'm3u8-parser';

// assign ffmpeg to window.ffmpeg if it doesn't already exist
window.ffmpeg ??= createFFmpeg({
  mainName: 'main',
  log: true,
  corePath: 'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js',
});

(async () => {
  // Load ffmpeg if it isn't already loaded
  if (!window.ffmpeg.isLoaded()) await window.ffmpeg.load();

  // Get the .m3u8 URL from the HTML
  const m3u8Url = document.querySelector('[data-hls-url]')?.getAttribute('data-hls-url') ||  document.querySelector('shreddit-player source')?.getAttribute('src');
  if (!m3u8Url) return;

  // Fetch and parse the master .m3u8 file
  const response = await fetch(m3u8Url);
  const masterPlaylistContent = await response.text();
  const masterParser = new Parser();
  masterParser.push(masterPlaylistContent);
  masterParser.end();
  const masterPlaylist = masterParser.manifest;

  // Find the highest resolution video and default audio playlists
  const videoVariant = masterPlaylist.playlists.reduce((prev, curr) => 
    prev.attributes.BANDWIDTH > curr.attributes.BANDWIDTH ? prev : curr
  );

  const audioGroupId = videoVariant.attributes.AUDIO;
  const audioVariants = masterPlaylist.mediaGroups.AUDIO[audioGroupId];
  const audioVariant = Object.values(audioVariants).find(audio => audio.default);
  const videoPlaylistUrl = new URL(videoVariant.uri, m3u8Url).toString();
  const audioPlaylistUrl = new URL(audioVariant.uri, m3u8Url).toString();

  // Fetch and parse the video and audio playlists concurrently
  const [videoPlaylistContent, audioPlaylistContent] = await Promise.all([
    fetch(videoPlaylistUrl).then(res => res.text()),
    fetch(audioPlaylistUrl).then(res => res.text())
  ]);

  const videoParser = new Parser();
  videoParser.push(videoPlaylistContent);
  videoParser.end();
  const videoPlaylist = videoParser.manifest;

  const audioParser = new Parser();
  audioParser.push(audioPlaylistContent);
  audioParser.end();
  const audioPlaylist = audioParser.manifest;

  // Fetch the first segments of video and audio concurrently
  const [video, audio] = await Promise.all([
    fetch(new URL(videoPlaylist.segments[0].uri, videoPlaylistUrl)).then(res => res.arrayBuffer()).then(buf => new Uint8Array(buf)),
    fetch(new URL(audioPlaylist.segments[0].uri, audioPlaylistUrl)).then(res => res.arrayBuffer()).then(buf => new Uint8Array(buf))
  ]);

  // Determine the segment file extensions
  const videoExt = videoPlaylist.segments[0].uri.split('.').pop();
  const audioExt = audioPlaylist.segments[0].uri.split('.').pop();
  const videoFileName = `video.${videoExt}`;
  const audioFileName = `audio.${audioExt}`;

  // Write video and audio segments to ffmpeg FS
  await ffmpeg.FS('writeFile', videoFileName, video);
  await ffmpeg.FS('writeFile', audioFileName, audio);

  // Merge video and audio segments
  await ffmpeg.run('-i', videoFileName, '-i', audioFileName, '-c', 'copy', 'output.mp4');
  const data = ffmpeg.FS('readFile', 'output.mp4');
  window.ffmpeg.exit();

  // Download the file from the buffer
  const downloadLink = document.createElement('a');
  downloadLink.href = window.URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
  downloadLink.download = `${document.title}.mp4`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
})();
