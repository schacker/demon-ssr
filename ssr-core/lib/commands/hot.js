import SsrDev from '../dev'
import path from 'path'
import fs from 'fs'

exports.command = 'hot <ssrConfig>'

exports.builder = {
  'ssrConfig': {
    description: 'ssrConfig. Default relative to process.cwd()'
  }
}

exports.handler = argv => {
  const configPath = path.resolve(process.cwd(), argv.ssrConfig)

  // config file found
  if(fs.existsSync(configPath)){
    let config = require(configPath)
    config = config.default || config
    const app = new SsrDev(config)
    app.dev().then((res)=>{
      console.log('Dev Server start: ' + 'http://' + res.host + ':' + res.port + '/')
    })
  } else {
    console.error('Missing ssr development environment configuration file')
  }
}