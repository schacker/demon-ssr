/**
 *  demon-ssr core
 /* @author huangwei
 */

import '@babel/polyfill'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import webpack from 'webpack'
import fs from 'fs'
import path from 'path'
import glob from 'glob'
import apollo from 'ctrip-apollo'
import stringStream from 'string-to-stream'
import multiStream from 'multistream'
import rimraf from 'rimraf'
import { Helmet } from 'react-helmet'
import WDS from 'webpack-dev-server'


import makeWebpackConfig from './config/webpack.config'
import Head from './components/Head'
import Document from './components/Document'
import EventBus from './utils/eventbus'


global.Helmet = Helmet


const DEV_SERVER_HOST = '127.0.0.1'
const DEV_SERVER_PORT = 3000

/**
 * 无缓存引入
 * @param {*} pkg
 * @returns
 */
const noCacheRequire = (pkg) => {
  delete require.cache[pkg]
  return require(pkg)
}

export const SSROptions = {
  baseDir: "",
  outputPath: "",
  host: "",
  port: 3000,
  publicPath: '',
  dev: false,
  inlineCSS: false,
  forceBuild: false,
  __ssrConfig: {
    nodeExternalsWhitelist: [],
    webpack: (webpack) =>{}
  },
  __testing: false
}

export const SSRInstanceOptions = {
  ...SSROptions
}

class Ssr {
  /**
   * 输出目标路径接口
   */
  resolveOutput
  /**
   * ssr构造参数
   */
  options = SSRInstanceOptions
  /**
   * 存放需要注入的基础数据
   */
  _injectedPayload = {}
  /**
   * 自定义webpack配置
   */
  _webpackConfig = {}
  /**
   * client端chunks
   */
  chunks
  /**
   * 资源映射表
   */
  assetsMap
  /**
   * 内部事件中心
   */
  __eventBus = new EventBus()

  constructor({
    baseDir = '',
    host = DEV_SERVER_HOST,
    port = DEV_SERVER_PORT,
    outputPath = path.resolve(baseDir, '.ssr'),
    dev = true,
    publicPath = '/',
    forceBuild = false,
    __ssrConfig,
    feeSdkConfig,
    metricsConfig,
    useDig = false,
    splitHot = false,
    apolloConfig,
    __testing,
    inlineCSS,
    NoSSR
  }) {

    if (dev) {
      publicPath = 'http://' + host + ':' + port + '/'
    }

    const ssrConfig = __ssrConfig ? __ssrConfig : (fs.existsSync(path.resolve(baseDir, './ssr.config.js')) ? require(path.resolve(baseDir, './ssr.config.js')) : {})

    this.options = {
      baseDir,
      host,
      port,
      outputPath,
      dev,
      publicPath,
      forceBuild,
      feeSdkConfig,
      metricsConfig,
      apolloConfig,
      splitHot,
      useDig,
      __testing,
      ssrConfig,
      inlineCSS,
      NoSSR
    }

    this.resolveOutput = (...args) => path.resolve.call(null, this.options.outputPath, ...args)
  }

  /**
   * 获取page路由，只是针对react js页面
   */
  get _pageEntries() {
    const pagesPath = path.resolve(this.options.baseDir, './pages')

    const pages = glob.sync('**/*.{js,jsx,ts}', {
      cwd: pagesPath
    })

    return pages
  }
  /**
   * 构造webpack配置
   * @param {*} onFinishedClientSideCompilation
   * @returns
   */
  _makeWebpackConfig = (onFinishedClientSideCompilation) => {
    return makeWebpackConfig({
      ...this.options,
      onFinishedClientSideCompilation,
      pages: this._pageEntries,
      customConfig: this.options.ssrConfig.webpack
    })
  }
  /**
   * client端构建完成回调
   * @param {*} state
   * @param {*} ctx
   */
  _onFinishedClientSideCompilation = (state, ctx) => {

    const json = state['client'].stats.toJson()

    this.chunks = json.chunks
    this.__eventBus.emit('compiled')
    json.errors.forEach(error => {
      console.log(error)
    })
  }
  /**
   * 多路构建
   * @returns
   */
  build() {
    const webpackConfig = this._makeWebpackConfig(this._onFinishedClientSideCompilation)
    // 下一次构建之前，删除上次的构建产物
    rimraf.sync(this.options.outputPath)
    return webpack(webpackConfig)
  }
  /**
   * 等待构建好的client chunks
   * @returns
   */
  async waitForChunks() {
    console.log('[ssr]', 'Waiting for compilation finish.')
    if(!this.options.splitHot){
      return new Promise((resolve) => {
        this.__eventBus.on('compiled', () => {
          resolve()
        })
      })
    } else {
      return false
    }

  }

  prepare() {
    // apollo 相关逻辑
    if(this.options.apolloConfig){
      // apollo 配置
      const host = 'https://apollo.configservice.com'
      const app = apollo({
        host: this.options.apolloConfig.host || host,
        appId: this.options.apolloConfig.appId || '',
        cachePath: this.options.apolloConfig.cachePath || '..',
        fileName: 'access.json'
      })
      const namespace = app.namespace()

      namespace.ready().then(() => {
        if(namespace.get('NoSSR') === 'true'){
          this.options.NoSSR = true
        } else {
          this.options.NoSSR = false
        }
      })
      //更新回调
      namespace.on('updated',(obj) =>{
        // console.log('#######',obj)
        if(obj.NoSSR === 'true'){
          this.options.NoSSR = true
        } else {
          this.options.NoSSR = false
        }
      })
    }

    if (this.options.dev !== true) {
      if (this.options.forceBuild === false) {
        if (!fs.existsSync(this.resolveOutput('./assetsmap.json'))) {
          throw new Error('缺少文件assetsmap.json，请先跑下 `ssr build`')
        }

        this.assetsMap = require(this.resolveOutput('./assetsmap.json'))

        if(this.options.metricsConfig){
          require('metrics-dog-dog')({
            cluster: this.options.metricsConfig.cluster || false,
            metricsPort: this.options.metricsConfig.metricsPort,
            metricsRegister: {
              serviceName: this.options.metricsConfig.serviceName,
              servicePort: this.options.metricsConfig.servicePort,
              env: this.options.metricsConfig.env||'test'
            }
          })
        }

        return Promise.resolve()
      } else {
        // TODO: 需要即时编译
      }
    }

    if (this.options.dev === true) {

      if(this.options.splitHot){
        return Promise.resolve()
      }

      const webpackConfig = this._makeWebpackConfig(this._onFinishedClientSideCompilation)
      this._webpackConfig = webpackConfig
      const [ serverSide, clientSide, vendors ] = webpackConfig

      const devServerOptions = {
        quiet: true,
        // inline: true,
        // hot: true,
        // port: this.options.port,
        // host: this.options.host,
        disableHostCheck: true,
        sockPort: this.options.port,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS"
          // "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
        }
      }

      const compiler = webpack([ clientSide, serverSide, vendors ])
      const devServer = new WDS(compiler, devServerOptions)

      return new Promise((res) => {
        devServer.listen(this.options.port, this.options.host, () => {
          this.__eventBus.on('compiled', res)

        })
      })
    }

  }
  /**
   * 注入渲染数据
   * @param {*} payload
   */
  inject(payload) {
    this._injectedPayload = payload
  }
  /**
   * ssr的渲染函数
   * @param { string } pageName 渲染页面路径
   * @param { Record<string, any> } injectedPayload 页面注入的渲染数据
   * @param {*} ctx 中间件上下文
   * @returns
   */
  async render(pageName, injectedPayload, ctx) {

    if (pageName.startsWith('/')) pageName = pageName.replace('/', '')

    let page
    let pageScripts = []
    let pageStyles = []
    let inlineCSSString = null
    let injected
    let initialProps = {}
    let body
    let helmet

    // 处理 生成的 js 和 css
    if (this.options.dev) {
      // 区分分离hot
      if(this.options.splitHot){
        let jsonPath = path.resolve(this.options.outputPath, "./ssr.hot.json")
        if(fs.existsSync(jsonPath)){
          let chunksStr = fs.readFileSync(jsonPath)
          this.chunks = JSON.parse(chunksStr)
        }
      }

      if (!this.chunks) {
        await this.waitForChunks()
      }

      const pageChunk = this.chunks.find(chunk => chunk.id === pageName)

      let files = []

      if (pageChunk) {
        files = pageChunk.files
      } else if (pageName === '_404') {
        files = files.concat([
          '_404.js'
        ])
      }
      // 页面脚本
      pageScripts = files.filter(file => file.endsWith('.js')).concat([
        '_SSR_VENDOR.js',
        '_SSR_MAIN.js'
      ])
      // 页面样式
      pageStyles = files.filter(file => file.endsWith('.css'))

    } else {
      // 非dev环境，找map表，同时去掉空串
      pageScripts = [
        this.assetsMap[pageName] && this.assetsMap[pageName].js,
        this.assetsMap['_SSR_VENDOR'].js,
        this.assetsMap['_SSR_MAIN'].js
      ].filter(_ => _)
      pageStyles = this.assetsMap[pageName] && this.assetsMap[pageName].css ? [this.assetsMap[pageName].css] : []
    }
    // 处理内联样式
    if (this.options.inlineCSS === true) {
      inlineCSSString =  pageStyles.map(fileName => {
        return fs.readFileSync(this.resolveOutput(fileName), 'utf8')
      })
    }

    // 检测代码是否稳定，渲染出问题后，降级成前端渲染，保证不出500
    try {
      // 找页面，否则出404，且dev环境不适用缓存
      if (this.options.dev) {
        if (!fs.existsSync((this.resolveOutput(pageName + '.cmd.js')))) {
          pageName = '_404'
          if (fs.existsSync(this.resolveOutput('./_404.cmd.js'))) {
            page = noCacheRequire(this.resolveOutput('./_404.cmd.js'))
          } else {
            page = {
              default: require('./components/_404')
            }
          }
        } else {
          page = noCacheRequire(this.resolveOutput(pageName + '.cmd.js'))
        }
      } else {
        if (!fs.existsSync((this.resolveOutput(pageName + '.cmd.js')))) {
          pageName = '_404'
          if (fs.existsSync(this.resolveOutput('./404.cmd.js'))) {
            page = require(this.resolveOutput('./404.cmd.js'))
          } else {
            page = {
              default: require('./components/_404')
            }
          }
        } else {
          page = require(this.resolveOutput(`./${pageName}.cmd.js`))
        }
      }
      // 合并注入的内部数据（基础数据）+ 自定义数据
      injected = Object.assign({}, this._injectedPayload, injectedPayload)
      initialProps = page.default.getInitialProps ? await page.default.getInitialProps(injected) : {}

      if(this.options.NoSSR){ // 主动设置CSR渲染
        body = ''
      } else {
        body = ReactDOMServer.renderToString(React.createElement(page.default, initialProps))
      }

      if (this.options.__testing) {
        Head.canUseDOM = false
      }

      helmet = Head.renderStatic()

    } catch (error) {
      // 出错了，需要降级
      body = ""
      helmet = Head.renderStatic()
      console.error('SSR ERROR:\n', error)
    }

    //'<!DOCTYPE html>' +
    if(ctx){
      ctx.type = 'html'
    }
    // 18.x 使用 renderToPipeableStream
    const doc = ReactDOMServer[ctx?'renderToStaticNodeStream':'renderToStaticMarkup'](React.createElement(Document, {
      pageScripts,
      pageStyles,
      pageName,
      dev: this.options.dev,
      inlineCSSString,
      publicPath: this.options.publicPath,
      initialProps,
      body,
      helmet
    }))

    const string = ctx ? multiStream([ stringStream('<!DOCTYPE html>'), doc ]): '<!DOCTYPE html>' + doc

    return {
      body: string,
      __webpackConfig: this._webpackConfig,
      __injected: injected,
      __initialProps: initialProps,
      __pageScripts: pageScripts,
      __pageStyles: pageStyles,
    }
  }
}

export default Ssr
