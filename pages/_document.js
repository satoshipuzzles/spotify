import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Properly add fonts in _document.js instead of index.js */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <body className="bg-gray-900">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
