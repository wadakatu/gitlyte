# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-12-27

### Changed
- **AI Models Updated**: Upgraded to latest AI models for improved performance
  - Anthropic: `claude-sonnet-4-20250514` → `claude-sonnet-4-5` (SWE-bench 77.2%)
  - OpenAI: `gpt-4o` → `gpt-4.1` (improved coding & instruction following)
  - Google: `gemini-2.0-flash` → `gemini-3-flash` (3x faster, better performance)

### Added
- **FAQ Section**: Added 7 frequently asked questions to README
  - AI provider selection guidance
  - API key acquisition links
  - Cost information
  - Customization options
  - Monorepo and private repository support
- **Troubleshooting Guide**: Added 6 common issues and solutions
  - API key errors
  - Site generation failures
  - GitHub Pages 404 errors
  - Style issues
  - Permission errors
  - AI generation failures

### Improved
- **Test Coverage**: Increased from 91.27% to 98.5%
  - Added 16 new tests for logo/favicon handling
  - Improved error handling coverage

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

[Unreleased]: https://github.com/wadakatu/gitlyte/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/wadakatu/gitlyte/releases/tag/v1.1.0
[1.0.0]: https://github.com/wadakatu/gitlyte/releases/tag/v1.0.0
