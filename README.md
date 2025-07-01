# GitLyte 🤖

> Instantly turn your GitHub repo into a live website with AI-powered design - no code needed.

A GitHub App built with [Probot](https://github.com/probot/probot) that automatically generates beautiful, custom websites from your repository data using AI analysis.

## ✨ Features

- 🤖 **AI-Powered Design**: Analyzes your repository and generates custom designs
- 🚀 **Astro-Based Sites**: Modern, fast static sites with excellent performance
- 🎨 **Unique Styling**: Every site gets a custom color scheme and layout
- 📱 **Responsive Design**: Looks great on all devices
- ⚡ **Auto-Deploy**: GitHub Actions automatically build and deploy
- 🔄 **Flexible Triggers**: Multiple ways to control when sites are generated
- 💬 **Comment Commands**: Generate sites on-demand with PR comments  
- 🏷️ **Label Control**: Fine-grained control with GitHub labels

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
- **Issue comment**

## 🐳 Docker

```sh
# 1. Build container
docker build -t gitlyte .

# 2. Start container
docker run -e APP_ID=<app-id> -e PRIVATE_KEY=<pem-value> -e OPENAI_API_KEY=<openai-key> gitlyte
```

## 🎯 How It Works

GitLyte offers multiple ways to generate your site:

### 📤 Push-Based Generation (Default)
Automatically generate sites when you push to the default branch:

1. **Install the GitHub App** on your repository
2. **Push to main branch** - GitLyte automatically generates your site

No configuration needed! Works out of the box.

### 💬 Comment Commands (On-Demand)
Use these commands in any PR comment to control generation:

```bash
@gitlyte generate        # Generate full site
@gitlyte preview         # Generate preview (faster, lightweight)
@gitlyte config          # Show current configuration
@gitlyte help            # Show available commands
```

**Command Options:**
```bash
@gitlyte generate --force           # Force regeneration 
@gitlyte preview --layout=minimal   # Preview with specific layout
```

### ⚙️ Advanced Push Configuration (Optional)
Customize push-based generation behavior:

```json
{
  "generation": {
    "push": {
      "enabled": true,
      "branches": ["main", "production"],
      "ignorePaths": ["docs/", ".github/", "test/"]
    }
  }
}
```

**Advanced Options:**
- **branches**: Target specific branches (default: repository default branch)
- **ignorePaths**: Skip generation when only these paths change
- **enabled**: Disable push generation if needed (default: true)

### ⚙️ Configuration-Based Control
Control generation behavior with `.gitlyte.json`:

```json
{
  "generation": {
    "labels": ["enhancement", "feat"],
    "push": {
      "enabled": true,
      "branches": ["main"],
      "ignorePaths": ["docs/", "test/"]
    }
  }
}
```

**Configuration Options:**
- **labels**: Required labels for PR-based generation
- **push.enabled**: Enable/disable push-based generation (default: true)
- **push.branches**: Target branches for push generation (defaults to repository default branch)
- **push.ignorePaths**: Paths to ignore for push generation

**When GitLyte generates your site, it:**
- Analyzes your repository (tech stack, purpose, audience)
- Generates a custom design strategy with AI
- Creates Astro components with unique styling  
- Deploys to GitHub Pages via Actions

## ⚙️ Configuration

Create a `.gitlyte.json` file in your repository root to customize your site:

```json
{
  "generation": {
    "trigger": "auto",
    "branches": ["main"],
    "labels": ["enhancement", "feat"]
  },
  "site": {
    "layout": "hero-focused",
    "theme": {
      "primary": "#667eea",
      "secondary": "#764ba2",
      "accent": "#f093fb"
    }
  },
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

#### Generation Settings
- **trigger**: `"auto"` | `"manual"` - When to generate sites
- **branches**: Array of branch names to generate for (empty = all branches)
- **labels**: Required labels for automatic generation

#### Site Settings  
- **layout**: `"hero-focused"` | `"minimal"` | `"grid"` | `"sidebar"` | `"content-heavy"`
- **theme**: Custom color scheme (primary, secondary, accent)

#### Assets
- **logo.path**: Path to logo image (relative path or absolute URL)
- **logo.alt**: Alt text for the logo  
- **favicon.path**: Path to favicon

If no configuration file is provided, GitLyte uses smart defaults based on your repository analysis.

## 📖 Usage Examples

### Quick Start (Default Behavior)
```bash
# 1. Install GitLyte GitHub App on your repo
# 2. Push to main branch → Site automatically generated!
```

**That's it!** No configuration needed - GitLyte works out of the box with push-based generation.

### Advanced Configuration (Optional)
For custom behavior, create `.gitlyte.json`:
```json
{
  "generation": {
    "push": {
      "branches": ["main", "production"],
      "ignorePaths": ["docs/", "test/"]
    }
  }
}
```

### Manual Control  
```json
{
  "generation": {
    "push": {
      "enabled": false
    }
  }
}
```

Then use:
- Comment: `@gitlyte generate` in any PR
- Or configure specific labels for PR-based generation

### Preview Mode
```bash
# In PR comment:
@gitlyte preview
```
- Generates to `preview/` directory instead of `docs/`
- Faster, lighter build for testing
- Perfect for experimenting with changes

### Branch-Specific Generation
```json
{
  "generation": {
    "branches": ["main", "production"],
    "labels": ["release", "deploy"]
  }
}
```

### Skip Generation
```bash
# In PR comment:
@gitlyte help  # Shows current settings without generating
```

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
└── gitlyte/                 # Main GitHub App
    ├── handlers/               # Event handlers
    │   ├── pr-handler.ts          # PR merge events
    │   └── comment-handler.ts     # Comment command processing
    ├── services/               # Core services  
    │   ├── trigger-controller.ts  # Generation trigger logic
    │   ├── repository-analyzer.ts # Repository analysis AI
    │   ├── site-generator.ts      # Site generation orchestration  
    │   └── static-file-deployer.ts # File deployment
    ├── utils/                  # Utilities
    │   ├── github-api.ts          # GitHub API interactions
    │   └── deployment-guard.ts    # Deployment conflict prevention
    ├── test/                   # Comprehensive test suites
    ├── templates/              # HTML/CSS generation templates
    └── types/                  # TypeScript definitions
```

## 🛠 Development

### Workspace Commands

```sh
# Build all packages
pnpm run build

# Run main GitLyte app
pnpm start

# Test the trigger system
pnpm exec vitest run test/services/trigger-controller.test.ts

# Run all tests
pnpm test

# Lint and format all packages
pnpm run lint:fix
pnpm run format:fix

# Run CI checks
pnpm run ci:check
```

### Key Features in Development

- **Trigger System**: Multiple generation triggers (auto, manual, comment, label)
- **AI Integration**: OpenAI-powered repository analysis and design generation  
- **Static Generation**: Pure HTML/CSS output (no framework dependencies)
- **Comprehensive Testing**: 392+ tests covering all functionality

## 🤝 Contributing

If you have suggestions for how GitLyte could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## 📄 License

[ISC](LICENSE) © 2025 wadakatu

---

*Built with AI-powered design generation and modern web technologies*
