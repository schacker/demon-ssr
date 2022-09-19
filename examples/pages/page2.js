import React from 'react'
import '../style/index.less'
import Head from '../../ssr-core/dist/components/Head'

class Page2 extends React.Component {

  static async getInitialProps (data) {
    return {
      foo: data.foo
    }
  }

  render () {
    return (
      <div>
        <Head>
          <title>Page2</title>
          <meta charSet="utf8" />
        </Head>
        <button>Hi?</button>
        {this.props.foo}
      </div>
    )
  }
}

export default Page2
