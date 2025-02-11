const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const axios = require("axios");

const { minimum_window_size } = require("./constants");

let mainWindow;

const create_main_window = () => {
  const checkServerAndLoadURL = (url) => {
    axios
      .get(url)
      .then(() => {
        mainWindow.loadURL(url);
      })
      .catch((error) => {
        console.error("Server not ready, retrying...", error);
        setTimeout(() => checkServerAndLoadURL(url), 2000);
      });
  };
  // Initialize the browser window.
  if (process.platform === "darwin") {
    mainWindow = new BrowserWindow({
      title: "PuPu",
      icon: path.join(__dirname, "favicon.ico"),
      width: 1200,
      height: 800,
      minHeight: minimum_window_size.height,
      minWidth: minimum_window_size.width,
      webSecurity: true,
      resizable: true,
      maximizable: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
      frame: true,
      hasShadow: true,
      titleBarStyle: "hidden",
      trafficLightPosition: { x: 14, y: 13 },
      vibrancy: "sidebar",
      visualEffectState: "active",
    });
    app.dock.setIcon(path.join(__dirname, "logo_512x512.png"));
  } else if (process.platform === "win32") {
    mainWindow = new BrowserWindow({
      title: "PuPu",
      icon: path.join(__dirname, "logo_512x512.png"),
      width: 1200,
      height: 800,
      minHeight: minimum_window_size.height,
      minWidth: minimum_window_size.width,
      webSecurity: true,
      hasShadow: true,
      transparent: false,
      resizable: true,
      maximizable: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
      titleBarStyle: "hidden",
      backgroundColor: "#181818",
      frame: true,
    });
  } else {
    mainWindow = new BrowserWindow({
      title: "PuPu",
      icon: path.join(__dirname, "favicon.ico"),
      width: 1200,
      height: 800,
      webSecurity: true,
      transparent: true,
      resizable: true,
      maximizable: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
      frame: false,
    });
  }
  mainWindow.setTitle("PuPu");

  // Load the index.html of the app.
  const isDev = !app.isPackaged;
  if (isDev) {
    checkServerAndLoadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(
      `file://${path.join(__dirname, "..", "build", "index.html")}`
    );
  }
};

app.whenReady().then(() => {
  create_main_window();
  register_window_state_event_listeners();
  register_will_navigate_event_listener();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/* { window state event listener } ===================================================================================================== */
const register_window_state_event_listeners = () => {
  mainWindow.on("maximize", () => {
    mainWindow.webContents.send("window-state-event-listener", {
      isMaximized: true,
    });
  });
  mainWindow.on("unmaximize", () => {
    mainWindow.setBounds({
      width: mainWindow.getBounds().width,
      height: mainWindow.getBounds().height,
    });
    mainWindow.webContents.send("window-state-event-listener", {
      isMaximized: false,
    });
  });
  mainWindow.on("enter-full-screen", () => {
    mainWindow.webContents.send("window-state-event-listener", {
      isMaximized: true,
    });
  });
  mainWindow.on("leave-full-screen", () => {
    mainWindow.webContents.send("window-state-event-listener", {
      isMaximized: false,
    });
  });
};
ipcMain.on("window-state-event-handler", (event, action) => {
  switch (action) {
    case "close":
      mainWindow.close();
      break;
    case "minimize":
      mainWindow.minimize();
      break;
    case "maximize":
      if (process.platform === "win32") {
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
      } else if (process.platform === "darwin") {
        if (mainWindow.isFullScreen()) {
          mainWindow.setFullScreen(false);
        } else {
          mainWindow.setFullScreen(true);
        }
      }
      break;
    default:
      break;
  }
});
/* { window state event listener } ===================================================================================================== */

/* { 拦截 will-navigate 事件 } */
const register_will_navigate_event_listener = () => {
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://")) {
      // 防止 Electron 内部页面也被拦截
      event.preventDefault();
      shell.openExternal(url);
    }
  });
};
