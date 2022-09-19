import Ssr from '../ssr'
import path from 'path'

exports.command = 'build <baseDir>'

exports.builder = {
  'baseDir': {
    description: 'baseDir. default relative process.cwd()'
  },
  'outputPath': {
    description: 'Output location of resource files'
  },
  'publicPath': {
    description: 'publicPath in webpack. Usually using a CDN'
  }
}

exports.handler = argv => {

  const ssr = new Ssr({
    ...argv,
    dev: false,
    baseDir: path.resolve(process.cwd(), argv.baseDir)
  })

  const compiler = ssr.build()
  compiler.run()
}