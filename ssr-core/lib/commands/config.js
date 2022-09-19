import path from 'path'
import fs from 'fs'

exports.command = 'config [envName]'

exports.builder = {
  'envName': {
    description: `Environment variables, such as: development, production, testing, etc., to construct the configuration file name, the default file name is ssr.env.js`
  },
  'outputPath': {
    description: 'File output location. Default is relative process.cwd()'
  }
}

exports.handler = argv => {

  const outPath = argv.outputPath ? path.resolve(process.cwd(), argv.outputPath) : process.cwd()
  const fileName = argv.envName ? `/ssr.${argv.envName}.js`:`/ssr.env.js`

  const configData = `const path = require('path')
    export default {
      publicPath: "/public/", // static file domain name, you can fill in the CDN domain name here
      baseDir: path.resolve(__dirname, './views-react'), // react template directory
      host: '', // The ip of the development environment requesting static resources can be left blank
      port: XXXX, // The port for the development environment to request static resources, optional
      dev: false // Whether to enable SSR in development mode
    }`

  fs.writeFile(outPath + fileName, configData, {encoding:'utf-8'}, ()=>{
    console.log('create config file success!');
  })

}