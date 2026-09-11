import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

// Next 16で`next lint`が廃止されたため、eslintを直接実行するflat configに移行した。
// ルールの内容は従来の.eslintrc.json("extends": "next/core-web-vitals")と同じ。
const config = [
  {
    ignores: ['.next/**', 'out/**', 'coverage/**', 'next-env.d.ts'],
  },
  ...nextCoreWebVitals,
];

export default config;
