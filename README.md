# GitLyte 🤖

> Instantly turn your GitHub repo into a live website with AI-powered design - no code needed.

A GitHub App built with [Probot](https://github.com/probot/probot) that automatically generates beautiful, custom websites from your repository data using AI analysis.

## ✨ Features

- 🤖 **AI-Powered Design**: Analyzes your repository and generates custom designs
- 🚀 **Astro-Based Sites**: Modern, fast static sites with excellent performance
- 🎨 **Unique Styling**: Every site gets a custom color scheme and layout
- 📱 **Responsive Design**: Looks great on all devices
- ⚡ **Auto-Deploy**: GitHub Actions automatically build and deploy
- 🔄 **Smart Updates**: Updates when you merge PRs with `enhancement` or `feat` labels

## 🚀 Setup

### Prerequisites
- Node.js 20.18.0+ (managed via mise)
- pnpm 10.12.1+ (managed via mise)
- OpenAI API key for AI-powered design generation

### Environment Setup

```sh
# Trust mise configuration
mise trust

# Install specified Node.js and pnpm versions
mise install
```

### Installation

```sh
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Add your OpenAI API key to .env
OPENAI_API_KEY=your_openai_api_key_here

# Run the bot
pnpm start
```

### GitHub App Configuration

Required permissions:
- **Contents**: Write
- **Issues**: Read
- **Metadata**: Read
- **Pages**: Write
- **Pull requests**: Read
- **Actions**: Write

Subscribe to events:
- **Pull request**

## 🐳 Docker

```sh
# 1. Build container
docker build -t gitlyte .

# 2. Start container
docker run -e APP_ID=<app-id> -e PRIVATE_KEY=<pem-value> -e OPENAI_API_KEY=<openai-key> gitlyte
```

## 🎯 How It Works

1. **Install the GitHub App** on your repository
2. **(Optional) Configure your site** with `.gitlyte.json` (see below)
3. **Create a PR** with `enhancement` or `feat` label
4. **Merge the PR** - GitLyte automatically:
   - Analyzes your repository (tech stack, purpose, audience)
   - Generates a custom design strategy with AI
   - Creates Astro components with unique styling
   - Deploys to GitHub Pages via Actions

## ⚙️ Configuration

To display your logo in the generated website, create a `.gitlyte.json` file in your repository root:

```json
{
  "logo": {
    "path": "./assets/logo.svg",
    "alt": "MyProject Logo"
  },
  "favicon": {
    "path": "./assets/favicon.ico"
  }
}
```

### Configuration Options

- **logo.path**: Path to your logo image (relative path or absolute URL)
- **logo.alt**: Alt text for the logo
- **favicon.path**: Path to your favicon

If no configuration file is provided, the site will display the repository name without a logo.

## 🛠 Architecture

```
GitHub Events → AI Analysis → Custom Site Generation → GitHub Pages Deploy
     ↓             ↓              ↓                    ↓
  PR/Issue      OpenAI API     Astro Components    Static Site
  Content       Design AI      Custom CSS/JS       Auto-Deploy
```

## 📁 Project Structure

```
packages/
├── gitlyte/           # Main GitHub App
│   ├── handlers/          # Event handlers (PR, Issues)
│   ├── services/          # Core services
│   │   ├── ai-analyzer.ts     # Repository analysis AI
│   │   ├── ai-code-generator.ts # Astro code generation
│   │   └── astro-generator.ts  # Site generation orchestration
│   ├── utils/             # Utilities (GitHub API, batch commits)
│   ├── test/              # Test suites
│   └── types.ts           # TypeScript definitions
└── demo/              # Astro demo application
    ├── src/
    │   ├── components/        # Demo Astro components
    │   ├── layouts/           # Layout templates
    │   └── pages/             # Demo pages
    └── astro.config.mjs

```

## 🛠 Development

### Workspace Commands

```sh
# Build all packages
pnpm run build

# Run main GitLyte app
pnpm start

# Start demo development server
pnpm run dev:demo

# Run all tests
pnpm test

# Lint and format all packages
pnpm run lint:fix
pnpm run format:fix

# Run CI checks
pnpm run ci:check
```

### Package Structure

This project uses pnpm workspaces:
- `@gitlyte/core` - Main GitHub App package
- `@gitlyte/demo` - Demo Astro application

## 🤝 Contributing

If you have suggestions for how GitLyte could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## 📄 License

[ISC](LICENSE) © 2025 wadakatu

---

*Built with AI-powered design generation and modern web technologies*
