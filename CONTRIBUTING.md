# Contributing to GitLyte

[fork]: /fork
[pr]: /compare
[code-of-conduct]: CODE_OF_CONDUCT.md

Hi there! We're thrilled that you'd like to contribute to this project. Your help is essential for keeping it great.

Please note that this project is released with a [Contributor Code of Conduct][code-of-conduct]. By participating in this project you agree to abide by its terms.

## Development Setup

### Prerequisites
- Node.js 20+ (managed via mise)
- pnpm 10.25.0+ (managed via mise)

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

# Build the action
pnpm run build
```

## Development Commands

### Build
```sh
pnpm run build       # Bundle with ncc
```

### Code Quality
```sh
pnpm run lint        # Run linter
pnpm run lint:fix    # Run linter with auto-fix
pnpm run format      # Check code formatting
pnpm run format:fix  # Format code
pnpm run check       # Run lint + format check
pnpm run check:fix   # Run lint + format with auto-fix
```

### CI Check
```sh
pnpm run ci:check    # Runs build + format + lint
```

## Project Structure

```
gitlyte/
├── src/                    # TypeScript source files
│   ├── index.ts           # Action entry point
│   ├── ai-provider.ts     # Multi-provider AI SDK wrapper
│   └── site-generator.ts  # Site generation logic
├── dist/                   # Bundled output (ncc)
├── templates/              # Workflow templates
│   └── gitlyte.yml        # Example workflow file
├── action.yml             # GitHub Action definition
└── tsconfig.json          # TypeScript config
```

## PR Creation Guidelines

**MANDATORY**: Before creating any Pull Request or committing changes, ALWAYS run the following commands:

```bash
pnpm run format:fix  # Fix code formatting
pnpm run lint:fix    # Fix linting issues
pnpm run build       # Bundle the action
```

For convenience, you can also use the CI check command:

```bash
pnpm run ci:check    # Runs all required checks in sequence
```

**IMPORTANT**: The `dist/` directory must be committed. After running `pnpm run build`, make sure to commit the updated `dist/` folder.

## Submitting a Pull Request

1. [Fork][fork] and clone the repository
2. Set up development environment (see above)
3. Create a new branch: `git checkout -b my-branch-name`
4. Make your changes
5. Run `pnpm run ci:check` to ensure all checks pass
6. Commit changes including the updated `dist/` directory
7. Push to your fork and [submit a pull request][pr]
8. Wait for review

Here are a few things you can do that will increase the likelihood of your pull request being accepted:

- Keep your changes as focused as possible
- Write a [good commit message](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)
- Ensure all CI checks pass
- Include updated `dist/` directory

Work in Progress pull requests are also welcome to get feedback early on.

## Architecture Overview

GitLyte is a GitHub Action that uses AI to generate custom websites from repository data.

### Core Flow
1. **Input Validation**: Validates API key, provider, quality mode
2. **Repository Analysis**: Fetches repo metadata and README via GitHub API
3. **Config Loading**: Loads `.gitlyte.json` if present
4. **AI Analysis**: Analyzes repository purpose, audience, style
5. **Design Generation**: Creates color palette and typography
6. **HTML Generation**: Generates landing page with Tailwind CSS
7. **File Output**: Writes generated files to output directory

### Key Files

- `action.yml` - GitHub Action metadata and inputs/outputs
- `src/index.ts` - Main entry point, handles inputs and orchestrates generation
- `src/ai-provider.ts` - Multi-provider AI abstraction (Anthropic, OpenAI, Google)
- `src/site-generator.ts` - Site generation logic (analysis, design, HTML)

### AI Providers

GitLyte supports multiple AI providers via Vercel AI SDK:
- **Anthropic**: Claude Sonnet 4 (default)
- **OpenAI**: GPT-4o
- **Google**: Gemini 2.0 Flash

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)
- [Security Policy](SECURITY.md)
- [Changelog](CHANGELOG.md)
