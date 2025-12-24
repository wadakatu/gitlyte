# GitLyte

> Instantly turn your GitHub repo into a live website with AI-powered design - no code needed.

A GitHub App built with [Probot](https://github.com/probot/probot) that automatically generates beautiful, custom websites from your repository data using AI analysis.

## Features

- **AI-Powered Design**: Analyzes your repository and generates custom designs using Claude, GPT-4, or Gemini
- **Static HTML Sites**: Modern, fast static sites with Tailwind CSS
- **Unique Styling**: Every site gets a custom color scheme and layout based on your project
- **Responsive Design**: Looks great on all devices
- **Auto-Deploy**: Push to main and your site is generated
- **Self-Refine Mode**: Optional high-quality mode that iteratively improves generated sites
- **Multi-Provider Support**: Works with Anthropic, OpenAI, or Google AI

## Quick Start

1. **Install the GitLyte GitHub App** on your repository
2. **Push to your default branch** (typically `main`)
3. **Review the auto-generated PR** with your new site
4. **Merge the PR** to deploy your site
5. **Enable GitHub Pages**: Settings > Pages > Source: Deploy from a branch > Branch: main > Folder: /docs

That's it! GitLyte works out of the box with zero configuration.

## How It Works

GitLyte uses AI to analyze your repository and create a custom website:

1. **Analyzes** your repository (README, tech stack, purpose, audience)
2. **Generates** a custom design with AI-crafted Tailwind CSS
3. **Creates** HTML pages with unique styling
4. **Opens a Pull Request** with the generated site

Every push to the default branch triggers a new site generation. The generated site is submitted as a PR for review, making it compatible with branch protection rules.

## Configuration

Create a `.gitlyte.json` file in your repository root to customize behavior:

```json
{
  "enabled": true,
  "outputDirectory": "docs",
  "ai": {
    "provider": "anthropic",
    "quality": "standard"
  },
  "logo": {
    "path": "./assets/logo.svg",
    "alt": "MyProject Logo"
  },
  "favicon": {
    "path": "./assets/favicon.ico"
  },
  "pages": ["features", "docs"]
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable site generation |
| `outputDirectory` | string | `"docs"` | Output directory for generated files |
| `ai.provider` | string | `"anthropic"` | AI provider: `"anthropic"`, `"openai"`, or `"google"` |
| `ai.quality` | string | `"standard"` | Quality mode: `"standard"` or `"high"` |
| `logo.path` | string | - | Path to logo image (relative to repo root) |
| `logo.alt` | string | - | Alt text for logo |
| `favicon.path` | string | - | Path to favicon file |
| `pages` | array | `[]` | Additional pages: `"features"`, `"docs"`, `"api"`, `"examples"`, `"changelog"` |

### Quality Modes

- **standard** (default): Single generation pass - fast and cost-effective
- **high**: Uses Self-Refine pattern to iteratively improve the site - better quality but uses more API calls

### AI Providers

GitLyte supports multiple AI providers. Set the appropriate environment variable:

| Provider | Environment Variable |
|----------|---------------------|
| Anthropic (default) | `ANTHROPIC_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Google | `GOOGLE_API_KEY` |

## Examples

### Minimal (Zero Config)
```bash
# Just install the app and push to main
# GitLyte uses smart defaults
```

### Custom Output Directory
```json
{
  "outputDirectory": "public"
}
```

### High Quality Mode
```json
{
  "ai": {
    "quality": "high"
  }
}
```

### Using OpenAI
```json
{
  "ai": {
    "provider": "openai"
  }
}
```

### Disable Generation
```json
{
  "enabled": false
}
```

### With Logo and Favicon
```json
{
  "logo": {
    "path": "./assets/logo.png",
    "alt": "My Project"
  },
  "favicon": {
    "path": "./assets/favicon.ico"
  }
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Run tests
pnpm test

# Start the app
pnpm run start
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details.

## Contributing

We'd love your help! Check out our [Contributing Guide](CONTRIBUTING.md) to get started.

## License

[ISC](LICENSE) 2025 wadakatu
<!-- trigger test -->

<!-- test -->
<!-- pr test v2 -->
<!-- final test -->
<!-- reconnect -->
