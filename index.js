const { app, BrowserWindow, dialog, Menu, shell } = require('electron')
const path = require('path')
const url = require('url')
const fs = require('fs');

let dest

function initDestination() {
  if (fs.existsSync('./params.json')) {
    dest = require('./params.json').path
  } else {
    dest = app.getPath('documents')
  }
}

let window = null

// Wait until the app is ready
app.once('ready', () => {

  initDestination()

  createMenu();

  // Create a new window
  window = new BrowserWindow({
    // Set the initial width to 400px
    width: 400,
    // Set the initial height to 500px
    height: 500,
    // Don't show the window until it ready, this prevents any white flickering
    show: false
  })

  // Load a URL in the window to the local index.html path
  window.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Show window when page is ready
  window.once('ready-to-show', () => {
    window.webContents.send('path:set', dest);
    window.show()
  })


})

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Set destination',
          click: () => {
            dialog.showOpenDialog(window, {
              properties: ['openDirectory']
            }, paths => {
              if (paths) {
                dest = paths[0]
                window.webContents.send('path:set', paths[0]);
                fs.writeFileSync('params.json', JSON.stringify({ path: paths[0] }));
              }
            })
          }
        },
        {
          label: 'Open destination',
          click: () => {
            shell.openItem(dest)
          }
        }
      ]
    },
    {
      label: 'Dev',
      submenu: [
        {
          label: 'Dev tools',
          accelerator: 'F12',
          click: (item, focusedWindow) => {
            focusedWindow.toggleDevTools();
          }
        },
        { role: 'reload' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu);
}
