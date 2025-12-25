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
    "mode": "dark"
  },
  "prompts": {
    "siteInstructions": "Use a friendly, approachable tone"
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable site generation |
| `outputDirectory` | string | `"docs"` | Output directory for generated files |
| `theme.mode` | string | `"dark"` | Theme mode: `"light"` or `"dark"` |
| `prompts.siteInstructions` | string | - | Custom instructions for AI generation (tone, language, style) |

## AI Providers

GitLyte supports multiple AI providers:

| Provider | Secret Name | Model |
|----------|-------------|-------|
| Anthropic (default) | `ANTHROPIC_API_KEY` | Claude Sonnet 4 |
| OpenAI | `OPENAI_API_KEY` | GPT-4o |
| Google | `GOOGLE_API_KEY` | Gemini 2.0 Flash |

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
