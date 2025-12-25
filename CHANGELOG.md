# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-25

### Added

#### Core Features
- **AI-Powered Site Generation**: Automatically generates beautiful, custom websites from repository data using AI analysis
- **Multi-Provider AI Support**: Works with Anthropic (Claude), OpenAI (GPT-4), and Google (Gemini)
- **Section-Based Generation**: Parallel generation of sections (hero, features, installation, footer, etc.) for faster site creation
- **Self-Refine Mode**: Optional high-quality mode that iteratively improves generated sites using LLM-as-Judge evaluation
- **Static HTML Sites**: Modern, fast static sites with Tailwind CSS (no build step required)

#### Configuration Options
- **Zero Configuration**: Works out of the box with smart defaults
- **AI Provider Selection**: Choose between `anthropic`, `openai`, or `google` via `ai.provider`
- **Quality Modes**: `standard` (fast) or `high` (Self-Refine) via `ai.quality`
- **Theme Modes**: `light` or `dark` theme via `theme.mode`
- **Trigger Modes**: `auto` (on every push) or `manual` (via comment command) via `generation.trigger`
- **Custom Prompts**: Add custom instructions for AI generation via `prompts.siteInstructions`
- **Logo and Favicon**: Custom branding support via `logo` and `favicon` configuration
- **Additional Pages**: Generate extra pages (features, docs, api, examples, changelog) via `pages`
- **Output Directory**: Configurable output directory (default: `docs`)

#### Trigger Modes
- **Auto Mode**: Automatically generates site on every push to default branch
- **Manual Mode**: Generate site only via `@gitlyte generate` command in Issue/PR comments
- **Comment Commands**: `@gitlyte generate` and `@gitlyte help`

#### Deployment
- **Pull Request Workflow**: Generated sites are submitted as PRs for review
- **GitHub Pages Compatible**: Works with GitHub Pages (deploy from `/docs` folder)
- **Branch Protection Compatible**: Works with protected branches via PR workflow
- **Batch Commits**: Uses GitHub Tree API for efficient file operations
- **Infinite Loop Prevention**: Skips commits made by GitLyte itself

#### Evaluation System
- **Lighthouse CI Integration**: Performance, accessibility, and SEO checks
- **LLM-as-Judge**: AI-based design quality evaluation
- **Benchmark Suite**: Automated testing against sample repositories
- **promptfoo Integration**: Prompt regression testing

### Technical Details

#### Supported AI Models
| Provider | Model |
|----------|-------|
| Anthropic (default) | claude-sonnet-4-20250514 |
| OpenAI | gpt-4o |
| Google | gemini-2.0-flash |

#### Generated Site Features
- Responsive design (mobile-first)
- Navigation with smooth scrolling
- Semantic HTML structure
- Tailwind CSS styling via CDN
- GitHub repository link

[1.0.0]: https://github.com/wadakatu/gitlyte/releases/tag/v1.0.0
