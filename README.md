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

## 🚀 Quick Start

1. **Install the GitLyte GitHub App** on your repository
2. **Push to your main branch** → Your site is automatically generated!
3. **Enable GitHub Pages** → Go to Settings > Pages > Source: Deploy from a branch → Branch: main → Folder: /docs

That's it! GitLyte works out of the box with zero configuration.

### Want to customize?
Create a `.gitlyte.json` file in your repository (see Configuration section below).


## 🎯 How It Works

GitLyte uses AI to analyze your repository and create a custom website:

1. **Analyzes** your repository (tech stack, purpose, audience)
2. **Generates** a custom design strategy with AI
3. **Creates** Astro components with unique styling  
4. **Deploys** to GitHub Pages automatically

### 📤 Push-Based Generation (Default)
Automatically generate sites when you push to the default branch - **no configuration needed!**

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

### View Configuration
```bash
# In PR comment:
@gitlyte help    # Shows current settings without generating
@gitlyte config  # Display current configuration
```


## 🤝 Contributing

We'd love your help! Check out our [Contributing Guide](CONTRIBUTING.md) to get started.

For technical details, see the [Architecture Documentation](docs/ARCHITECTURE.md).

## 📄 License

[ISC](LICENSE) © 2025 wadakatu

---

*Built with AI-powered design generation and modern web technologies*
