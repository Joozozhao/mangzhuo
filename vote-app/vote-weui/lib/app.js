layui.config({
    base: './lib/',  // 设定 Layui 扩展模块的所在目录，一般与 extend 方法搭配使用
    version: false,  // 用于更新模块缓存，默认 false。若设为 true，即让浏览器不缓存。也可设为一个任意数值
    dir: 'layui/',   // layui 基础目录，用于动态导入 src/layui.js 时的内置模块的加载。一般无需设置
    debug: false,    // 用于开启调试模式，默认 false。若设为 true，则模块的引入节点会保留在页面
}).extend({
    drawer: 'drawer/drawer',
});