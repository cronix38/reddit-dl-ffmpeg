import { createFFmpeg } from '@ffmpeg/ffmpeg';
import { Parser } from 'm3u8-parser';

// Assign ffmpeg to window.ffmpeg if it doesn't already exist
window.ffmpeg ??= createFFmpeg({
  mainName: 'main',
  log: true,
  corePath: 'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js',
});

(async () => {
  // Load ffmpeg if it isn't already loaded
  if (!window.ffmpeg.isLoaded()) await window.ffmpeg.load();

  // Get the .m3u8 URL from the HTML
  const m3u8Url = document.querySelector('[data-hls-url]')?.getAttribute('data-hls-url') || document.querySelector('shreddit-player source')?.getAttribute('src');
  if (!m3u8Url) return;

  // Fetch and parse the master .m3u8 file
  const response = await fetch(m3u8Url);
  const masterPlaylistContent = await response.text();
  const masterParser = new Parser();
  masterParser.push(masterPlaylistContent);
  masterParser.end();
  const masterPlaylist = masterParser.manifest;

  // Display available video and audio options to the user
  const videoOptions = masterPlaylist.playlists.map((playlist, index) => {
    return { index, bandwidth: playlist.attributes.BANDWIDTH, resolution: playlist.attributes.RESOLUTION };
  });

  const audioOptions = Object.entries(masterPlaylist.mediaGroups.AUDIO).flatMap(([groupId, audios]) => 
    Object.values(audios).map((audio, index) => ({ index, groupId, ...audio }))
  );

  // Find the highest resolution video and the last audio option
  const defaultVideoIndex = videoOptions.reduce((prev, curr) => (prev.bandwidth > curr.bandwidth ? prev : curr)).index;
  const defaultAudio = audioOptions[audioOptions.length - 1];
  const defaultAudioIndex = defaultAudio.index;
  const defaultAudioGroupId = defaultAudio.groupId;

  // Inject modal dialog HTML and CSS
  const modalHtml = `
    <div id="myModal" class="modal">
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Select Video and Audio Options</h2>
        <label for="videoSelect">Video Options:</label>
        <select id="videoSelect"></select>
        <br>
        <label for="audioSelect">Audio Options:</label>
        <select id="audioSelect"></select>
        <br>
        <button id="startButton">Download</button>
      </div>
    </div>
  `;

  const modalCss = `
    .modal {
      display: none;
      position: fixed;
      z-index: 1;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background-color: rgb(0,0,0);
      background-color: rgba(0,0,0,0.4);
    }
    .modal-content {
      background-color: #fefefe;
      margin: 15% auto;
      padding: 20px;
      border: 1px solid #888;
      width: 80%;
      max-width: 500px;
    }
    .close {
      color: #aaa;
      float: right;
      font-size: 28px;
      font-weight: bold;
    }
    .close:hover,
    .close:focus {
      color: black;
      text-decoration: none;
      cursor: pointer;
    }
  `;

  // Append CSS to the document head
  const style = document.createElement('style');
  style.innerHTML = modalCss;
  document.head.appendChild(style);

  // Append modal HTML to the document body
  const modal = document.createElement('div');
  modal.innerHTML = modalHtml;
  document.body.appendChild(modal);

  // Populate the video and audio select elements
  const videoSelect = document.getElementById('videoSelect');
  videoOptions.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.index;
    opt.textContent = `Bandwidth: ${option.bandwidth}, Resolution: ${option.resolution.width}x${option.resolution.height}`;
    videoSelect.appendChild(opt);
  });

  const audioSelect = document.getElementById('audioSelect');
  audioOptions.forEach(option => {
    const opt = document.createElement('option');
    opt.value = JSON.stringify({ index: option.index, groupId: option.groupId });
    opt.textContent = `URI: ${option.uri}`;
    audioSelect.appendChild(opt);
  });

  // Set default selections
  videoSelect.value = defaultVideoIndex;
  audioSelect.value = JSON.stringify({ index: defaultAudioIndex, groupId: defaultAudioGroupId });

  // Display the modal
  const modalElement = document.getElementById('myModal');
  modalElement.style.display = 'block';

  // Close the modal when the user clicks on the close button
  const closeButton = modalElement.querySelector('.close');
  closeButton.onclick = () => modalElement.style.display = 'none';

  // Start the download process when the user clicks the start button
  const startButton = document.getElementById('startButton');
  startButton.addEventListener('click', async () => {
    const selectedVideoIndex = parseInt(videoSelect.value);
    const { index: selectedAudioIndex, groupId: selectedAudioGroupId } = JSON.parse(audioSelect.value);

    const videoVariant = masterPlaylist.playlists[selectedVideoIndex];
    const audioVariant = Object.values(masterPlaylist.mediaGroups.AUDIO[selectedAudioGroupId])[selectedAudioIndex];

    console.log(masterPlaylist.mediaGroups.AUDIO, selectedAudioGroupId, selectedAudioIndex);

    console.log('variants', videoVariant, audioVariant);

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

    // Close the modal
    modalElement.style.display = 'none';
  });
})();
