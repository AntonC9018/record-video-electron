const { ipcRenderer, desktopCapturer, remote } = require('electron')
const fs = require('fs');

var recing = {
  cam: false,
  dis: false
}

var path = '';

try {
  fs.readFile('params.json', (err, data) => {
    path = JSON.parse(data).path;
  })
} catch (e) {}

ipcRenderer.on('path:set', (e, p) => path = p);

$(document).ready(function () {
  $('.modal').modal({
    onCloseEnd: function() {
      $('#close-modal').click()
    }
  });
  $('.tooltipped').tooltip();
});


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

function getSources() {
  return new Promise((resolve) => {
    desktopCapturer.getSources(
      {
        types: ['window', 'screen'],
        thumbnailSize: { width: 400, height: 400 },
        fetchWindowIcons: true
      },

      (error, sources) => {
        if (error) throw error
        resolve(sources)
      })
  })
}


function startRec(s) {

  const constraints = {
      audio: {
        mandatory: 
          {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: s.id
          }
      },
      video: {
        mandatory: 
          {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: s.id
          }
      }
    }

  return navigator.mediaDevices.getUserMedia(constraints)
}


function selectWindow(sources) {

  return new Promise((resolve) => {
    // ul 'collection' that will hold each of the soruces
    const ul = $('#sources')
    // empty it
    ul.find('div.row').remove()

    for (let i = 0; i < sources.length; i++) {
      $(
          `
            <div class="row">
              <div class="card">
                <div class="card-image">
                  <img src="${sources[i].thumbnail.toDataURL()}"/>
                </div>
                <div class="card-content center-align">                    
                  <span class="card-title"><h6>${sources[i].name}</h6></span>  
                  <a class="waves-effect waves-light btn">select</a>
                </div>
              </div>         
            </div>`
        )
      .appendTo(ul)
      .click(() => {
        resolve(sources[i])
      })
    }


    // $('#modal').find('.modal-content').append(im)

    $('#close-modal').click(function _() {
      resolve(false)
      $(this).off('click', _)
    })

    // open up the modal
    $('#modal').modal('open')
  })
  
}

function closeModal() {
  $('#modal').modal('close')
}



$('.start-rec.dis').click(async () => {
  // already recording
  if (recing['dis'] === true) return;

  // start recording
  recing['dis'] = true;

  // get all available sources
  let ss = await getSources()

  // if got no sources
  if (!ss || (ss && ss.length == 0)) {
    recing['dis'] = false;
    return;
  }

  // let the modal pop up and the user to select what source they want
  let source = await selectWindow(ss)

  // close the popup
  closeModal()

  // the user closed the popup themselves or some error occured
  if (!source) {
    recing['dis'] = false;
    return;
  }

  let stream = await startRec(source)

  if (stream) handleStream(stream, 'dis')

  else {
    recing['dis'] = false
  }
})

function handleStream (stream, cl) {
  
  uiStartRec(cl)

  const recorder = new MediaRecorder(stream); // what receives the video

  // what preprocesses the video and passes it over to the 'storage_stream'
  const blob_reader = new FileReader();

  let fname = getName(path, cl);

  // what saves to file
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

    if (!recing[cl]) return; 

    uiStopRec(cl)

    $(this).off('click', clicking)    

    // stop services
    recorder.stop();
    storage_stream.end();
    stream.getTracks().forEach(e => e.stop());
    recing[cl] = false;

  })
}

function handleError (e) {
  console.log(e)
  recing['dis'] = false; // error: no recording is taking place
}


function uiStopRec(cl) {
  $('.start-rec.' + cl).removeClass('disabled');
  $('.stop-rec.' + cl).addClass('disabled');
  $('.rec-text.' + cl).slideUp('medium');
}

function uiStartRec(cl) {
  $('.start-rec.' + cl).addClass('disabled');
  $('.stop-rec.' + cl).removeClass('disabled');
  $('.rec-text.' + cl).slideDown('medium');
}

function getName(path, cl) {
  let d = new Date();
  return `${path}/${cl} (${d.getDate()}-${d.getMonth() + 1}_${d.getHours()}-${d.getMinutes()}).mp4`
}