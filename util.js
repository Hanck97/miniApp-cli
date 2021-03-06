const fs = require('fs');    
const path = require('path');                       


module.exports = {
  // 查看文件/文件夹是否存在
  checkFileIsExists(path) {
    return fs.existsSync(path);
  },

  // 创建文件夹
  createDir(src) {
    return new Promise(resolve => {
      fs.mkdir(src, { recursive: true }, (err) => {
        if (err) {
          throw err;
        }
        return resolve();
      });
    });
  },

  // 获取文件夹下的list
  readDir(path) {
    return new Promise(resolve => {
      fs.readdir(path, (err, files) => {
        if (err) {
          throw err;
        }
        return resolve(files);
      })
    });
  },

  // 复制文件
  copyFile(originPath, curPath) {
    return new Promise(resolve => {
      fs.copyFile(originPath, curPath, fs.constants.COPYFILE_EXCL, (err) => {
        if (err) {
          throw err;
        }
        return resolve('copyFile success!!!');
      });
    });
  },

  // 复制批量文件
  copyFilesArr(originPath, curPath, arr) {
    return new Promise(async resolve => {
      let extName = '';
      for (let i = 0; i <= arr.length - 1; i++) {
        extName = path.extname(arr[i]);
        await this.copyFile(`${originPath}/${arr[i]}`, curPath + extName);
      }
      return resolve('copyFilesArr success!!!');
    });
  },

  // 获取文件名/模块名
  getPathSubSting(path) {
    let result = '', arr = path.split('/');
    for (let i = arr.length; i > 0; i--) {
        if (!!arr[i]) {
            result = arr[i];
            break;
        }
    }
    return result;
  }
};
