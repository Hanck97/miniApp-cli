#!/usr/bin/env node
const version = require('./package').version;                
const program = require('commander');                        
const createProgramFs = require('./lib/create-program-fs');

// 设定版本号
program.version(version, '-v, --version');

// 处理接收到的命令
program.command('init').description('创建页面/组件').action((cmd, _) => createProgramFs(cmd))

// entrance
program.parse(process.argv)
