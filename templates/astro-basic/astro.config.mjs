import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://{{OWNER}}.github.io',
  base: '/{{REPO_NAME}}',
  output: 'static',
  build: {
    assets: 'assets'
  }
});