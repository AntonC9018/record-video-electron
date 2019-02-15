// In the renderer process.
const { desktopCapturer, remote } = require('electron')

const constraints = {
  video: true
}

var recording = false;

$('.start-rec').click(() => {
  navigator.mediaDevices.getUserMedia(constraints)
          .then((stream) => handleStream(stream))
          .catch((e) => handleError(e))
})

function handleStream (stream) {
  recording = true;
  const recorder = new MediaRecorder(stream); // what receives the video

  // what preprocesses the video and passes it over to the 'storage_stream'
  const blob_reader = new FileReader();

  // what saves to file
  const storage_stream = require("fs").createWriteStream('i.mp4');

  // array that stores unprocessed data
  const blobs = [];

  blob_reader.onload = function(ev) {
      if (!recording) return;
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


  $('.stop-rec').on('click', function clicking () {
    recording = false;
    $(this).off('click', clicking)

    // stop services
    recorder.stop();
    storage_stream.end();
    stream.getTracks()[0].stop();

  })
}

function handleError (e) {
  console.log(e)
}
