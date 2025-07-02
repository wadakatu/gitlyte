# GitLyte 🤖

> Instantly turn your GitHub repo into a live website with AI-powered design - no code needed.

A GitHub App built with [Probot](https://github.com/probot/probot) that automatically generates beautiful, custom websites from your repository data using AI analysis.

## ✨ Features

- 🤖 **AI-Powered Design**: Analyzes your repository and generates custom designs
- 🚀 **Static HTML Sites**: Modern, fast static sites with excellent performance
- 🎨 **Unique Styling**: Every site gets a custom color scheme and layout
- 📱 **Responsive Design**: Looks great on all devices
- ⚡ **Auto-Deploy**: GitHub Actions automatically build and deploy
- 🔄 **Flexible Triggers**: Multiple ways to control when sites are generated
- 💬 **Comment Commands**: Generate sites on-demand with PR comments  
- 🏷️ **Label Control**: Simple control with `gitlyte` and `gitlyte:preview` labels

## 🚀 Quick Start

1. **Install the GitLyte GitHub App** on your repository
   - ✨ GitLyte automatically creates the necessary labels (`gitlyte` and `gitlyte:preview`)
2. **Add a label to your PR**:
   - `gitlyte` - Generate full production site
   - `gitlyte:preview` - Generate lightweight preview site
3. **Merge the PR** → Your site is automatically generated!
4. **Enable GitHub Pages** → Go to Settings > Pages > Source: Deploy from a branch → Branch: main → Folder: /docs (or your configured `outputDirectory`)

That's it! GitLyte works out of the box with zero configuration.

### Want to customize?
Create a `.gitlyte.json` file in your repository (see Configuration section below).


## 🎯 How It Works

GitLyte uses AI to analyze your repository and create a custom website:

1. **Analyzes** your repository (tech stack, purpose, audience)
2. **Generates** a custom design strategy with AI
3. **Creates** HTML pages with unique styling  
4. **Deploys** to GitHub Pages automatically

### 🏷️ PR Merge Generation (Default)
Automatically generate sites when you merge PRs with GitLyte labels - **no configuration needed!**

- **`gitlyte`** - Generates a full production-ready site
- **`gitlyte:preview`** - Generates a lightweight preview version (faster, uses less resources)

> 💡 **Note**: These labels are automatically created when you install the GitLyte app and removed when you uninstall it.

### 📤 Push-Based Generation
For direct pushes to branches, configure in `.gitlyte.json`:
```json
{
  "generation": {
    "push": {
      "enabled": true,
      "branches": ["main"]
    }
  }
}
```

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

## ⚙️ Configuration

Create a `.gitlyte.json` file in your repository root to customize your site:

```json
{
  "generation": {
    "trigger": "auto",
    "branches": ["main"],
    "labels": ["gitlyte", "gitlyte:preview", "custom-label"],
    "outputDirectory": "docs"
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
- **labels**: Custom labels for automatic generation (default: `["gitlyte", "gitlyte:preview"]`)
- **outputDirectory**: Output directory for generated files (default: `"docs"`)

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
    "outputDirectory": "build",
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
- Generates to `{outputDirectory}/preview/` directory (default: `docs/preview/`)
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

### View Configuration
```bash
# In PR comment:
@gitlyte help    # Shows current settings without generating
@gitlyte config  # Display current configuration
```

### Custom Output Directory
```json
{
  "generation": {
    "outputDirectory": "build"
  }
}
```
This generates files to:
- **Production site**: `build/` directory
- **Preview site**: `build/preview/` directory

Common output directories:
- `"docs"` (default) - GitHub Pages ready
- `"build"` - Common build directory  
- `"dist"` - Distribution directory
- `"public"` - Public assets directory

**Note**: Remember to update your GitHub Pages settings to match your chosen directory.

## 🤝 Contributing

We'd love your help! Check out our [Contributing Guide](CONTRIBUTING.md) to get started.

For technical details, see the [Architecture Documentation](docs/ARCHITECTURE.md).

## 📄 License

[ISC](LICENSE) © 2025 wadakatu

---

*Built with AI-powered design generation and modern web technologies*
