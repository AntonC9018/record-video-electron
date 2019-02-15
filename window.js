$(document).ready(function(){

$('.tooltipped').tooltip();

const { ipcRenderer, desktopCapturer, remote } = require('electron')
const fs = require('fs');

var recing = {
  cam: 'false',
  dis: 'false'
}

var path = '';

try {
  fs.readFile('params.json', (err, data) => {
    console.log(JSON.parse(data));
    path = JSON.parse(data).path;
  })
} catch (e) {}

ipcRenderer.on('path:set', (e, p) => path = p);

$('.start-rec.cam').click(() => {
  if (recing['cam'] === true) return;
  recing['cam'] = true;

  const constraints = {
    video: true,
    audio: true
  }
  navigator.mediaDevices.getUserMedia(constraints)
          .then((stream) => handleStream(stream, 'cam'))
          .catch((e) => handleError(e))
})

$('.start-rec.dis').click(() => {
  if (recing['dis'] === true) return;
  recing['dis'] = true;

  desktopCapturer.getSources({ types: ['window', 'screen'] }, (error, sources) => {
    if (error) throw error

    for (let s of sources) {
      if (!s.name.includes('Chrome')) continue;

      const constraints = {
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: s.id
          }
        },
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: s.id
          }
        }
      }

      navigator.mediaDevices.getUserMedia(constraints)
              .then((stream) => handleStream(stream, 'dis'))
              .catch((e) => handleError(e))

    }

  })
})

function handleStream (stream, cl) {
  $('.start-rec.' + cl).addClass('disabled');
  $('.stop-rec.' + cl).removeClass('disabled');
  $('.rec-text.' + cl).slideDown('medium');


  const recorder = new MediaRecorder(stream); // what receives the video

  // what preprocesses the video and passes it over to the 'storage_stream'
  const blob_reader = new FileReader();

  // what saves to file
  let d = new Date();
  let fname = `${path}/${cl} (${d.getDate()}-${d.getMonth()}_${d.getHours()}-${d.getMinutes()}).mp4`;
  const storage_stream = fs.createWriteStream(fname);

  // array that stores unprocessed data
  const blobs = [];

  blob_reader.onload = function(ev) {
      if (!recing[cl]) return;
      // write to file
      // NOTE: 'ev.currentTarget' is the 'blob_reader'
      storage_stream.write(Buffer.from(ev.currentTarget.result));

      // if there are unprocessed frames in the queue
      if (blobs.length) {
          // fire this same event to itself
          ev.currentTarget.readAsArrayBuffer(blobs.shift());
      }
  }

  // each time new frame arrives ...
  recorder.addEventListener("dataavailable", function(ev) {
      if (blob_reader.readyState != 1) { // if has not been just called
          // fire the fn above with the new frame of video
          blob_reader.readAsArrayBuffer(ev.data);
      } else {
          // push the frame to the queue as the writer is being busy
          blobs.push(ev.data);
      }
  });

  recorder.start(1) // start recording, where timeslice = 1


  $('.stop-rec.' + cl).on('click', function clicking () {
    recing[cl] = false;
    $(this).off('click', clicking)
    $('.stop-rec.' + cl).addClass('disabled');
    $('.start-rec.' + cl).removeClass('disabled');
    $('.rec-text.' + cl).slideUp('medium');

    // stop services
    recorder.stop();
    storage_stream.end();
    stream.getTracks().forEach(e => e.stop());

  })
}

function handleError (e) {
  console.log(e)
}

})
