import 'push-if'
const webpack = require('webpack')
const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const merge = require('webpack-merge')
const AssetsWebpackPlugin = require('assets-webpack-plugin')
const WebpackBar = require('webpackbar')
const WFP = require('write-file-webpack-plugin')
const nodeExternals = require('webpack-node-externals')
const fs = require('fs')

const noop = () => {}

export default ({
  customConfig,
  baseDir,
  outputPath,
  publicPath,
  ssrConfig,
  dev,
  pages,
  __testing,
  onFinishedClientSideCompilation = ()=>{},
}) => {

  const entries = {}
  
  pages.forEach(page => {
    entries[page.split('.').slice(0, -1).join('.')] = './pages/' + page
  })

  const assetsWebpackPlugin = new AssetsWebpackPlugin({
    path: outputPath,
    filename: 'assetsmap.json',
    fullPath: false
  })

  const babelLoader = {
    loader: 'babel-loader',
    options: {
      root: baseDir,
      cacheDirectory: dev ? path.resolve(baseDir, 'cache') : false,
      configFile: fs.existsSync(path.resolve(baseDir, './babel.config.js')) ? path.resolve(baseDir, './babel.config.js') :  path.resolve(__dirname, '../../babel_tpl.config.js')
    }
  }

  // struct webpack config
  let defaultCommonConfig = {
    mode: dev ? 'development' : 'production',
    context: baseDir,
    devtool: false,
    resolve: {
      extensions: [".jsx", ".js"],
      modules: [
        'node_modules',
        path.resolve(__dirname, '../../node_modules'),
      ]
    },
    resolveLoader: {
      modules: [
        path.resolve(__dirname, '../../node_modules'),
        'node_modules',
      ]
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /(node_modules)/,
          use: [
            babelLoader
          ]
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            { loader: 'css-loader', options: { importLoaders: 1 } }
          ]
        },
        {
          test: /\.less$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader','less-loader']
        }
      ]
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: dev ? '[name].css' : '[name]-[chunkhash].css'
      }),
    ]
      .pushIf(dev, new webpack.NamedModulesPlugin())
  }

  const passedOptions = {
    miniCSSLoader: MiniCssExtractPlugin.loader,
    dev,
    publicPathBase: publicPath,
    merge: merge.smart,
    __testing: __testing,
    baseDir
  }

  const clientSideConfig = customConfig ? merge.smart(defaultCommonConfig, customConfig(webpack, {
    ...passedOptions,
    compileEnv: 'client'
  })) : defaultCommonConfig

  const serverSideConfig = customConfig ? merge.smart(defaultCommonConfig, customConfig(webpack, {
    ...passedOptions,
    compileEnv: 'server'
  })) : defaultCommonConfig
  // 
  delete serverSideConfig['externals']

  const clientSide = merge.smart({
    entry: {
      ...entries,
      '_SSR_MAIN': path.resolve(__dirname, '../client/render')
    },
    externals: {
      'react': 'React',
      'react-dom': 'ReactDOM'
    },
    target: 'web',
    output: {
      filename: dev ? '[name].js' : '[name]-[chunkhash].js',
      path: outputPath,
      publicPath,
      library: '__ssr',
      globalObject: 'this',
      libraryTarget: 'umd',
      hotUpdateChunkFilename: 'hot/hot-update.js',
      hotUpdateMainFilename: 'hot/hot-update.json'
    },
    plugins: [
      new WebpackBar({
        name: 'client',
        minimal: !dev,
        color: 'green',
        done: onFinishedClientSideCompilation || noop,
      }) 
    ]
    .pushIf(!dev, assetsWebpackPlugin)
    ,
  }, clientSideConfig)

  const whitelist = [/\.(?!(?:jsx?|json)$).{1,5}$/i]
  const serverSide = merge.smart({
    entry: entries,
    target: 'node',
    externals: [nodeExternals({
      whitelist: ssrConfig.nodeExternalsWhitelist ? whitelist.concat(ssrConfig.nodeExternalsWhitelist) : whitelist
    })],
    output: {
      filename: '[name].cmd.js',
      path: outputPath,
      publicPath,
      libraryTarget: 'commonjs2'
    },
    plugins: [
      new WFP(),
      new WebpackBar({
        name: 'server',
        color: 'orange',
        minimal: !dev,
        done: onFinishedClientSideCompilation || noop
      })
    ]
  }, serverSideConfig)

  const vendors = merge.smart({
    entry: {
      '_SSR_VENDOR': [
        require.resolve('@babel/polyfill'),
        path.resolve(__dirname, '../client/common'),
      ],
    },
    output: {
      filename: dev ? '[name].js' : '[name]-[chunkhash].js',
      path: outputPath,
      publicPath,
    },
    plugins: [
    ]
    .pushIf(!dev, assetsWebpackPlugin)
  }, clientSideConfig)

  return [
    serverSide,
    clientSide,
    vendors
  ]
}