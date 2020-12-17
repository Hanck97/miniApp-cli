const inquirer = require('inquirer');                     // 启动交互命令行
const fs = require('fs');                           // 文件读取模块
const path = require('path');                         // 路径模块
const fuzzy = require('fuzzy');                        // 模糊查找
const jsonFormat = require("json-format");                  // json格式化（用来美化文件输出格式）
const Log = require("../log");                       // 控制台输出
const Util = require('../util');                      // 工具函数

const Config = require('../config');                    // 获取配置项

const regEn = /[`~!@#$%^&*()+<>?:"{},.\/;'[\]]/im, regCn = /[·！#￥（——）：；“”‘、，|《。》？、【】[\]]/im;


// 全局属性
const __Data__ = {
  // 小程序项目app.json
  appJson: '',

  // 小程序所有分包
  appModuleList: {},

  // 小程序所有页面
  appPagesList: {}
};

function getAppJson() {
  const appJsonRoot = path.join(Config.entry, 'app.json');
  try {
    return require(appJsonRoot);
  } catch (e) {
    Log.error(`未找到app.json, 请检查当前文件目录是否正确，path: ${appJsonRoot}`);
    process.exit(1);
  }
}

function writePageAppJson(name, modulePath = '') {
  return new Promise((resolve, reject) => {
    let appJson = __Data__.appJson;

    // 填充主包
    if (!modulePath) {
      appJson.pages.push(`pages/${name}/${name}`);
    } else {
      // 当前下标q
      let idx = Object.values(__Data__.appModuleList).indexOf(modulePath);
      if (idx === -1) {
        Log.error('app.json不存在当前module, path: ' + modulePath);
        return;
      }
      appJson.subPackages[idx].pages.push(`pages/${name}/${name}`);
    }

    // 写入文件
    fs.writeFile(`${Config.entry}/app.json`, jsonFormat(appJson), (err) => {
      if (err) {
        Log.error('自动写入app.json文件失败，请手动填写，并检查错误');
        reject();
      } else {
        resolve();
      }
    });
  });
}

// 解析app.json
function parseAppJson() {

  // app Json 原文件
  let appJson = __Data__.appJson = getAppJson();

  // 获取主包页面
  appJson.pages.forEach(path => __Data__.appPagesList[Util.getPathSubSting(path)] = '');

  // 获取分包，页面列表
  appJson.subPackages.forEach(item => {
    __Data__.appModuleList[Util.getPathSubSting(item.root)] = item.root;
    item.pages.forEach(path => __Data__.appPagesList[Util.getPathSubSting(path)] = item.root);
  });
};

// 获取路径 -> 校验 -> 获取文件信息 -> 复制文件 -> 修改app.json -> 输出结果信息
async function createPage(name, modulePath = '', appType = 'weapp') {
  // 模版文件路径
  let templateRoot = path.join(`${Config.template}/${appType}`, '/page');
  if (!Util.checkFileIsExists(templateRoot)) {
    Log.error(`未找到模版文件, 请检查当前文件目录是否正确，path: ${templateRoot}`);
    return;
  }

  // 业务文件夹路径
  let page_root = path.join(Config.entry, modulePath, '/pages', name);

  // 查看文件夹是否存在
  let isExists = await Util.checkFileIsExists(page_root);
  if (isExists) {
    Log.error(`当前页面已存在，请重新确认, path: ` + page_root);
    return;
  }

  // 创建文件夹
  await Util.createDir(page_root);

  // 获取文件列表
  let files = await Util.readDir(templateRoot);

  // 复制文件
  await Util.copyFilesArr(templateRoot, `${page_root}/${name}`, files);

  // 填充app.json
  await writePageAppJson(name, modulePath);

  // 成功提示
  Log.success(`createPage success, path: ` + page_root);
}

module.exports = function () {
  // 解析appJson
  parseAppJson();

  // 问题执行
  inquirer.prompt([
    {
      type: 'list',
      name: 'appType',
      message: '选择你当前的小程序：',
      choices: [
        'alipay',
        'weapp',
      ]
    },
    {
      type: 'list',
      name: 'mode',
      message: '选择你想生成的模版类型：',
      choices: [
        'page',
        'component',
      ],
    },
    {
      type: 'input',
      name: 'name',
      message: answer => `设置 ${answer.mode} 的名字 (例如: index):`,
      validate(input) {
        let done = this.async();

        // 输入不得为空
        if (input === '') {
          done('You must input name!!!');
          return;
        }

        // 校验文件名是否符合规范
        if (regEn.test(input) || regCn.test(input)) {
          done('The name entered does not conform to the rule!!!');
          return;
        }

        done(null, true);
      }
    },
    // 设置page所属module
    {
      type: 'autocomplete',
      name: 'modulePath',
      message: '设置页面所属的分包',
      choices: [],
      suggestOnly: false,
      source(answers, input) {
        return Promise.resolve(fuzzy.filter(input, ['none', ...Object.keys(__Data__.appModuleList)]).map(el => el.original));
      },
      filter(input) {
        if (input === 'none') {
          return '';
        }
        return __Data__.appModuleList[input];
      },
      when(answer) {
        return answer.mode === 'page';
      }
    },
    // 选择组件作用域
    {
      type: 'list',
      name: 'componentScope',
      message: '设置组件所属的作用域',
      choices: [
        'global',
        'module',
        'page',
      ],
      when(answer) {
        return answer.mode === 'component';
      }
    },
    // 设置组件所属module
    {
      type: 'autocomplete',
      name: 'parentModule',
      message: '设置组件所属的分包',
      choices: [],
      suggestOnly: false,
      source(answers, input) {
        return Promise.resolve(fuzzy.filter(input, Object.keys(__Data__.appModuleList)).map(el => el.original));
      },
      filter(input) {
        if (input === 'none') {
          return '';
        }
        return __Data__.appModuleList[input];
      },
      when(answer) {
        return answer.mode === 'component' && answer.componentScope === 'module';
      }
    },
    // 设置组件所属pages
    {
      type: 'autocomplete',
      name: 'parentPage',
      message: '设置组件所属的页面',
      choices: [],
      suggestOnly: false,
      source(answers, input) {
        return Promise.resolve(fuzzy.filter(input, Object.keys(__Data__.appPagesList)).map(el => el.original));
      },
      filter(input) {
        if (input === 'none') {
          return '';
        }
        return { page: input, root: __Data__.appPagesList[input] };
      },
      when(answer) {
        return answer.mode === 'component' && answer.componentScope === 'page';
      }
    }
  ]).then(answers => {
      let { name, appType, mode, componentScope, modulePath = '', parentModule, parentPage } = answers;
      switch (mode) {
        case 'page':
          createPage(name, modulePath, appType);
          break;
        case 'component':
          createComponent({ name, scope: componentScope, parentModule, parentPage });
          break;
        default:
          console.log('to the end');
      }
    });
};