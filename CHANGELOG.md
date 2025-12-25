# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Architecture Conversion**: Converted from Probot GitHub App to GitHub Action
  - Users now provide their own API keys via GitHub Secrets
  - No hosted infrastructure required
  - Full control over workflow configuration

### Removed
- Probot framework and webhook-based architecture
- Evaluation system (Lighthouse CI, LLM-as-Judge)
- Comment command trigger (`@gitlyte generate`)
- Multi-page generation (features, docs, api pages)
- Self-Refine mode (high quality mode)

## [1.0.0] - 2025-12-25

### Added

#### Core Features
- **AI-Powered Site Generation**: Automatically generates beautiful, custom websites from repository data using AI analysis
- **Multi-Provider AI Support**: Works with Anthropic (Claude), OpenAI (GPT-4), and Google (Gemini)
- **Static HTML Sites**: Modern, fast static sites with Tailwind CSS (no build step required)

#### Configuration Options
- **Zero Configuration**: Works out of the box with smart defaults
- **AI Provider Selection**: Choose between `anthropic`, `openai`, or `google` via `ai.provider`
- **Quality Modes**: `standard` (fast) or `high` via `ai.quality`
- **Theme Modes**: `light` or `dark` theme via `theme.mode`
- **Custom Prompts**: Add custom instructions for AI generation via `prompts.siteInstructions`
- **Output Directory**: Configurable output directory (default: `docs`)

#### GitHub Action
- **Workflow Integration**: Use as a step in GitHub Actions workflows
- **GitHub Secrets**: Store API keys securely in repository secrets
- **Flexible Triggers**: Configure triggers via workflow (push, pull_request, workflow_dispatch, etc.)
- **GitHub Pages Compatible**: Works with GitHub Pages (deploy from `/docs` folder)

### Technical Details

#### Supported AI Models
| Provider | Model |
|----------|-------|
| Anthropic (default) | claude-sonnet-4-20250514 |
| OpenAI | gpt-4o |
| Google | gemini-2.0-flash |

#### Generated Site Features
- Responsive design (mobile-first)
- Semantic HTML structure
- Tailwind CSS styling via CDN
- GitHub repository link
- Light and dark theme support

[Unreleased]: https://github.com/wadakatu/gitlyte/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/wadakatu/gitlyte/releases/tag/v1.0.0
