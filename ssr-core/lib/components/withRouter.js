import React from 'react'
import { BrowserRouter, StaticRouter } from 'react-router-dom'

const defOptions = {
  getUrl: (payload) => payload,
  basename: '' 
}

module.exports = (WrappedComponent, options = defOptions) => {
  return class WithRouter extends React.Component {

    static async getInitialProps (payload) {

      const url = options.getUrl(payload)

      let wrappedComponentProps = {}

      if (WrappedComponent.getInitialProps) {
        wrappedComponentProps = await WrappedComponent.getInitialProps(payload)
      }

      return {
        wrappedComponentProps,
        url,
        context: {}
      }
    }

    render () {
      if (process.browser) {
        return (
          <BrowserRouter basename={options.basename}>
            <WrappedComponent {...this.props.wrappedComponentProps} />
          </BrowserRouter>
        )
      } else {
        return (
          <StaticRouter
            basename={options.basename}
            context={this.props.context}
            location={this.props.url}
          >
            <WrappedComponent {...this.props.wrappedComponentProps} />
          </StaticRouter>
        )
      }
    }
  }
}