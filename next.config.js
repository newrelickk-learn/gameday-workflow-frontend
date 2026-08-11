/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Jestテスト環境でrequire-hookを無効化
  experimental: {
    swcMinify: true,
  },
  // newrelicはCJS/ネイティブ依存を含むためバンドルせず、実行時にnode_modulesから
  // そのままrequireする（standalone出力にもそのままコピーされる）
  serverExternalPackages: ['newrelic'],
}

module.exports = nextConfig

