# GitLyte

> Instantly turn your GitHub repo into a live website with AI-powered design - no code needed.

A GitHub Action that automatically generates beautiful, custom landing pages from your repository data using AI analysis.

## Features

- **AI-Powered Design**: Analyzes your repository and generates custom designs using Claude, GPT-4, or Gemini
- **Static HTML Sites**: Modern, fast static sites with Tailwind CSS
- **Unique Styling**: Every site gets a custom color scheme and layout based on your project
- **Responsive Design**: Looks great on all devices
- **Multi-Provider Support**: Works with Anthropic, OpenAI, or Google AI
- **GitHub Pages Ready**: Output is ready for GitHub Pages deployment

## Quick Start

### 1. Add the workflow file

Create `.github/workflows/gitlyte.yml`:

```yaml
name: Generate Site with GitLyte

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate Site
        uses: wadakatu/gitlyte@v1
        with:
          api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          provider: anthropic
          quality: standard
          output-directory: docs

      - name: Commit and Push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add docs/
          git diff --staged --quiet || git commit -m "chore: update GitLyte generated site"
          git push
```

### 2. Add your API key as a secret

1. Go to your repository Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Add your AI provider's API key:
   - Name: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GOOGLE_API_KEY`
   - Value: Your API key

### 3. Enable GitHub Pages

1. Go to Settings > Pages
2. Source: "Deploy from a branch"
3. Branch: `main`, Folder: `/docs`
4. Click "Save"

That's it! Push to main and your site will be generated automatically.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `api-key` | Yes | - | API key for the AI provider |
| `provider` | No | `anthropic` | AI provider: `anthropic`, `openai`, or `google` |
| `quality` | No | `standard` | Quality mode: `standard` or `high` |
| `output-directory` | No | `docs` | Output directory for generated files |
| `theme-mode` | No | `dark` | Theme mode: `light`, `dark`, or `auto` |
| `theme-toggle` | No | `false` | Include a light/dark mode toggle button |
| `site-instructions` | No | - | Custom instructions for AI generation (tone, language, style) |
| `logo-path` | No | - | Path to logo image file in repository (e.g., `assets/logo.svg`) |
| `favicon-path` | No | - | Path to favicon file in repository (e.g., `assets/favicon.ico`) |
| `seo-title` | No | - | Custom page title for SEO (defaults to repository name) |
| `seo-description` | No | - | Meta description for search engines |
| `og-image-path` | No | - | Path to Open Graph image file (e.g., `assets/og-image.png`) |
| `twitter-handle` | No | - | Twitter/X handle for Twitter Card (e.g., `@username`) |
| `site-url` | No | - | Site URL for canonical link and OG URL |
| `generate-sitemap` | No | `true` | Generate sitemap.xml (requires `site-url`) |
| `generate-robots` | No | `true` | Generate robots.txt (requires `site-url`) |
| `github-token` | No | `${{ github.token }}` | GitHub token for API access |

## Outputs

| Output | Description |
|--------|-------------|
| `output-directory` | Directory where the site was generated |
| `pages-count` | Number of pages generated |

## Configuration

Create a `.gitlyte.json` file in your repository root to customize generation:

```json
{
  "enabled": true,
  "outputDirectory": "docs",
  "theme": {
    "mode": "dark",
    "toggle": true
  },
  "prompts": {
    "siteInstructions": "Use a friendly, approachable tone"
  },
  "logo": {
    "path": "assets/logo.svg",
    "alt": "My Project Logo"
  },
  "favicon": {
    "path": "assets/favicon.ico"
  },
  "seo": {
    "title": "My Awesome Project",
    "description": "A powerful tool for developers",
    "keywords": ["developer-tools", "productivity"],
    "ogImage": { "path": "assets/og-image.png" },
    "twitterHandle": "@myproject",
    "siteUrl": "https://myproject.github.io/repo"
  },
  "sitemap": {
    "enabled": true,
    "changefreq": "weekly",
    "priority": 0.8
  },
  "robots": {
    "enabled": true,
    "additionalRules": ["Disallow: /private/"]
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable site generation |
| `outputDirectory` | string | `"docs"` | Output directory for generated files |
| `theme.mode` | string | `"dark"` | Theme mode: `"light"`, `"dark"`, or `"auto"` |
| `theme.toggle` | boolean | `false` | Include a light/dark mode toggle button |
| `prompts.siteInstructions` | string | - | Custom instructions for AI generation (tone, language, style) |
| `logo.path` | string | - | Path to logo image file in repository |
| `logo.alt` | string | - | Alt text for the logo image |
| `favicon.path` | string | - | Path to favicon file in repository |
| `seo.title` | string | - | Custom page title (defaults to repository name) |
| `seo.description` | string | - | Meta description for search engines |
| `seo.keywords` | string[] | - | Keywords for search engines |
| `seo.ogImage.path` | string | - | Path to Open Graph image file |
| `seo.twitterHandle` | string | - | Twitter/X handle for Twitter Card |
| `seo.siteUrl` | string | - | Site URL for canonical link and OG URL |
| `sitemap.enabled` | boolean | `true` | Enable/disable sitemap.xml generation |
| `sitemap.changefreq` | string | `"weekly"` | How frequently the page changes |
| `sitemap.priority` | number | `0.8` | Priority of URLs (0.0 to 1.0) |
| `robots.enabled` | boolean | `true` | Enable/disable robots.txt generation |
| `robots.additionalRules` | string[] | - | Additional rules for robots.txt |

## AI Providers

GitLyte supports multiple AI providers:

| Provider | Secret Name | Model |
|----------|-------------|-------|
| Anthropic (default) | `ANTHROPIC_API_KEY` | Claude Sonnet 4.5 |
| OpenAI | `OPENAI_API_KEY` | GPT-4.1 |
| Google | `GOOGLE_API_KEY` | Gemini 3 Flash |

### Using a different provider

```yaml
- uses: wadakatu/gitlyte@v1
  with:
    api-key: ${{ secrets.OPENAI_API_KEY }}
    provider: openai
```

## Examples

### Minimal Setup

```yaml
- uses: wadakatu/gitlyte@v1
  with:
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Custom Output Directory

```yaml
- uses: wadakatu/gitlyte@v1
  with:
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    output-directory: public
```

### High Quality Mode

```yaml
- uses: wadakatu/gitlyte@v1
  with:
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    quality: high
```

### With SEO Settings

```yaml
- uses: wadakatu/gitlyte@v1
  with:
    api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    seo-title: My Awesome Project
    seo-description: A powerful tool that makes developers more productive
    og-image-path: assets/og-image.png
    twitter-handle: "@myproject"
    site-url: https://myproject.github.io/repo
```

### Create PR Instead of Direct Commit

```yaml
name: Generate Site with GitLyte

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate Site
        uses: wadakatu/gitlyte@v1
        with:
          api-key: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v6
        with:
          title: "chore: update GitLyte generated site"
          commit-message: "chore: update GitLyte generated site"
          branch: gitlyte/update-site
          delete-branch: true
```

## How It Works

GitLyte uses AI to analyze your repository and create a custom website:

1. **Analyzes** your repository (README, tech stack, purpose, audience)
2. **Generates** a custom design system with colors and typography
3. **Creates** HTML pages with Tailwind CSS styling
4. **Outputs** files to your specified directory

The AI reads your README and repository metadata to understand your project, then generates a unique landing page tailored to your project's purpose.

## FAQ

### Which AI provider should I use?

**Anthropic (Claude)** is recommended for most users. It provides excellent design quality and understands project context well. OpenAI and Google are good alternatives if you already have API keys for those services.

### Where do I get an API key?

- **Anthropic**: [console.anthropic.com](https://console.anthropic.com/)
- **OpenAI**: [platform.openai.com](https://platform.openai.com/)
- **Google**: [aistudio.google.com](https://aistudio.google.com/)

### How much does it cost?

GitLyte itself is free. You only pay for AI API usage:
- **Standard mode**: ~$0.01-0.05 per generation
- **High quality mode**: ~$0.05-0.15 per generation

Actual costs depend on your README length and AI provider pricing.

### Can I customize the generated site?

Yes! You can:
- Use `site-instructions` to guide the AI's tone and style
- Add your own logo and favicon
- Choose light/dark theme mode
- Add a theme toggle button

### Will GitLyte overwrite my existing files?

GitLyte only writes to the specified `output-directory` (default: `docs`). It will overwrite files within that directory but won't touch files outside of it.

### Can I use GitLyte with a monorepo?

Yes. Just specify the correct `output-directory` and configure your workflow to run in the appropriate directory.

### Does GitLyte work with private repositories?

Yes. GitLyte uses the GitHub token provided in the workflow, which has access to private repository content.

## Troubleshooting

### "API key is required" error

**Cause**: The API key secret is not set or has the wrong name.

**Solution**:
1. Go to repository Settings > Secrets and variables > Actions
2. Verify the secret name matches your provider:
   - Anthropic: `ANTHROPIC_API_KEY`
   - OpenAI: `OPENAI_API_KEY`
   - Google: `GOOGLE_API_KEY`
3. Ensure the secret value is correct (no extra spaces)

### Site is not generated

**Cause**: The workflow may have failed or the output wasn't committed.

**Solution**:
1. Check the Actions tab for workflow errors
2. Verify `permissions: contents: write` is set in your workflow
3. Ensure the commit step runs after generation

### GitHub Pages shows 404

**Cause**: GitHub Pages is not configured correctly.

**Solution**:
1. Go to Settings > Pages
2. Set Source to "Deploy from a branch"
3. Select the correct branch (e.g., `main`) and folder (`/docs`)
4. Wait a few minutes for deployment

### Styles are broken or missing

**Cause**: The generated HTML uses Tailwind CSS via CDN.

**Solution**:
1. Ensure your network allows CDN access
2. Check if any Content Security Policy blocks external scripts
3. Try regenerating the site

### Permission denied errors

**Cause**: The workflow lacks necessary permissions.

**Solution**: Add these permissions to your workflow:

```yaml
permissions:
  contents: write
  pull-requests: write  # Only if using PR workflow
```

### AI generation failed

**Cause**: AI API rate limits or temporary errors.

**Solution**:
1. Wait a few minutes and retry
2. Check your API key has sufficient credits
3. Try a different AI provider
4. Use `high` quality mode (includes retry logic)

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Lint
pnpm run lint

# Format
pnpm run format
```

## Contributing

We'd love your help! Check out our [Contributing Guide](CONTRIBUTING.md) to get started.

## Security

See [SECURITY.md](SECURITY.md) for security policy and vulnerability reporting.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.

## License

[ISC](LICENSE) 2025 wadakatu
