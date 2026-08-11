/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // 祖先ディレクトリにある無関係なpackage-lock.jsonをNext.jsがモノレポルートと
  // 誤検出し、.next/standaloneの出力パスがネストしてしまう問題を防ぐ
  outputFileTracingRoot: __dirname,
  // Jestテスト環境でrequire-hookを無効化
  experimental: {
    swcMinify: true,
  },
  // newrelicはCJS/ネイティブ依存を含むためバンドルせず、実行時にnode_modulesから
  // そのままrequireする（standalone出力にもそのままコピーされる）
  serverExternalPackages: ['newrelic'],
}

module.exports = nextConfig

