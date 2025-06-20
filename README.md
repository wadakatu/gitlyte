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
- OpenAI API key for AI-powered design generation

### Installation

```sh
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your OpenAI API key to .env
OPENAI_API_KEY=your_openai_api_key_here

# Run the bot
npm start
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

GitLyte can automatically detect logos and themes, but you can explicitly configure them by creating a `.gitlyte.json` file in your repository root:

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

### Priority Order

1. **Manual Configuration**: `.gitlyte.json` or `package.json` gitlyte section
2. **Auto-Detection**: Common logo file patterns (logo.png, icon.svg, etc.)
3. **README Images**: Images with "logo", "icon", or "brand" in alt text

If no configuration file is provided, GitLyte will automatically detect logos from your repository files and README images.

## 🛠 Architecture

```
GitHub Events → AI Analysis → Custom Site Generation → GitHub Pages Deploy
     ↓             ↓              ↓                    ↓
  PR/Issue      OpenAI API     Astro Components    Static Site
  Content       Design AI      Custom CSS/JS       Auto-Deploy
```

## 📁 Project Structure

```
src/
├── handlers/          # Event handlers (PR, Issues)
├── services/          # Core services
│   ├── ai-analyzer.ts     # Repository analysis AI
│   ├── ai-code-generator.ts # Astro code generation
│   └── astro-generator.ts  # Site generation orchestration
├── utils/             # Utilities (GitHub API, batch commits)
└── types.ts           # TypeScript definitions

templates/
└── astro-basic/       # Base Astro template structure
```

## 🤝 Contributing

If you have suggestions for how GitLyte could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## 📄 License

[ISC](LICENSE) © 2025 wadakatu

---

*Built with AI-powered design generation and modern web technologies*
