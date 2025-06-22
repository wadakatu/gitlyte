import { defineConfig } from 'astro/config';

// 開発環境ではbaseパスを使用しない、本番環境では/gitlyteを使用
const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  site: 'https://wadakatu.github.io',
  base: isProduction ? '/gitlyte' : '/',
  output: 'static',
  build: {
    assets: 'assets'
  }
});