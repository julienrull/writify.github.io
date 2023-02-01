const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const fs = require('fs');
const path = require('path');

let WORKSPACE = '';

function getWorkspacePath(){
  let workspace =  WORKSPACE.split("\\");
  workspace.pop();
  return workspace.join("\\");
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    icon: `${__dirname}/src/assets/favicon.ico`,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      preload: path.join(__dirname, 'mainPreload.js'),
    }
  })
  win.loadFile(`${__dirname}/dist/index.html`)
  win.webContents.openDevTools();
}

function loadFolderTree(treeElementName){
  const stats = fs.lstatSync(treeElementName);
  let tree = {
      name: treeElementName.split("\\").pop(),
      type: "FILE",
      content: "",
      children: []
    };
  // * FOLDER
  if(stats.isDirectory()) {
    let folder = fs.readdirSync(treeElementName);
    tree.type = "FOLDER";
    folder.forEach((elem) => {
      let element = loadFolderTree(treeElementName + "\\" + elem);
      if(element.type !== "UNKNOWN") {
        tree.children = [...tree.children, element];
      }
    });
  }else {
    if(path.extname(treeElementName).toLocaleLowerCase() === ".txt" || path.extname(treeElementName).toLocaleLowerCase() === ".md") {
      let fileData = fs.readFileSync(treeElementName, 'utf8');
      tree.content = fileData.toString();
    }else {
      tree.type = "UNKNOWN";
    }
  }
  return tree;
}

ipcMain.handle('loadFolderFiles', (event, path) => {
  try{
    WORKSPACE = path;
    return loadFolderTree(WORKSPACE);
  }catch(err){
    console.error(err);
    return "ERROR";
  }
});
ipcMain.handle('saveFolderFiles', (event, fileName, textContent, path, type) => {
  try{
    let workspace =  getWorkspacePath();
    let formatedPath = path.replace(/\//g, "\\");
    formatedPath = formatedPath.replace(/\\\\/g, "\\");
    const filePath = workspace + formatedPath + "\\" + fileName;
    console.log(filePath);
    if(type === "FOLDER"){
      fs.mkdirSync(filePath);
    }else{
      fs.writeFileSync(filePath, textContent);
    }
  }catch(err){
    console.error(err);
  }
  console.log("File saved !");
});
ipcMain.handle('renameFolderOrFile', (event, treeElementName, newTreeElementName, path) => {
  try{
    let workspace =  getWorkspacePath();
    let formatedPath = path.replace(/\//g, "\\");
    formatedPath = formatedPath.replace(/\\\\/g, "\\");
    const oldFilePath = workspace + formatedPath + "\\" + treeElementName;
    const newFilePath = workspace + formatedPath + "\\" + newTreeElementName;
    fs.renameSync(oldFilePath, newFilePath);
    console.log("Tree element renamed !");
  }catch(err){
    console.error(err);
  }
});
ipcMain.handle('deleteFolderOrFile', (event, treeElementName, type, path) => {
  try{
    let workspace =  getWorkspacePath();
    let formatedPath = path.replace(/\//g, "\\");
    formatedPath = formatedPath.replace(/\\\\/g, "\\");
    const filePath = workspace + formatedPath + "\\" + treeElementName;
    if(type === "FOLDER"){
      fs.rmSync(filePath, { recursive: true });
    }else{
      fs.unlinkSync(filePath);
    }
    
    console.log("Tree element deleted !");
  }catch(err){
    console.error(err);
  }
});
ipcMain.handle('dialog', (event, method, params) => {       
  return dialog[method](params);
});

app.whenReady().then(() => {
  createWindow()
})