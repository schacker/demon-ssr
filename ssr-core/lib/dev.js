import makeWebpackConfig from './config/webpack.config'
import fs from 'fs'
import path from 'path'
import glob from 'glob'
import EventBus from './utils/eventbus'

const webpack = require('webpack')
const WDS = require('webpack-dev-server')

const DEV_SERVER_HOST = '127.0.0.1'
const DEV_SERVER_PORT = 3000

class SsrDev {
  __eventBus = new EventBus()

  constructor({
    baseDir,
    host = DEV_SERVER_HOST,
    port = DEV_SERVER_PORT,
    outputPath = path.resolve(baseDir, '.ssr'),
    publicPath,
    __ssrConfig,
    __testing
  }){
    const ssrConfig = __ssrConfig ? __ssrConfig : (fs.existsSync(path.resolve(baseDir, './ssr.config.js')) ? require(path.resolve(baseDir, './ssr.config.js')) : {})
    
    this.options = {
      baseDir,
      host,
      port,
      outputPath,
      dev: true,
      publicPath,
      __testing,
      ssrConfig
    }
  }

  _onFinishedClientSideCompilation = (state, ctx) => {
    const json = state['client'].stats.toJson()
    const chunks = json.chunks.map((item)=>{
       return { id: item.id, files: item.files }
    })

    fs.writeFile(path.resolve(this.options.outputPath, "ssr.hot.json"), JSON.stringify(chunks), (err)=>{
      if(err){
        console.log(err)
        return
      }

      this.__eventBus.emit('compiled')
    })
    
    json.errors.forEach(error => {
      console.log(error)
    })
  }

  // 只是针对react js页面
  get _pageEntries() {
    const pagesPath = path.resolve(this.options.baseDir, './pages')

    const pages = glob.sync('**/*.{js,jsx,ts}', {
      cwd: pagesPath
    })

    return pages
  }

  _makeWebpackConfig = (onFinishedClientSideCompilation) => {
    return makeWebpackConfig({
      ...this.options,
      onFinishedClientSideCompilation,
      pages: this._pageEntries,
      customConfig: this.options.ssrConfig.webpack
    })
  }

  dev() {
    const webpackConfig = this._makeWebpackConfig(this._onFinishedClientSideCompilation)
    // this._webpackConfig = webpackConfig
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
        this.__eventBus.on('compiled', ()=>{
          res({port: this.options.port, host: this.options.host})
        })
      })
    })
  }

}

export default SsrDev