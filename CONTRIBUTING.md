# Contributing to GitLyte

[fork]: /fork
[pr]: /compare
[code-of-conduct]: CODE_OF_CONDUCT.md

Hi there! We're thrilled that you'd like to contribute to this project. Your help is essential for keeping it great.

Please note that this project is released with a [Contributor Code of Conduct][code-of-conduct]. By participating in this project you agree to abide by its terms.

## 🚀 Development Setup

### Prerequisites
- Node.js 20.18.0+ (managed via mise)
- pnpm 10.12.1+ (managed via mise)
- Anthropic API key for AI-powered design generation

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

# Add your Anthropic API key to .env
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Run the bot
pnpm start
```

## 🛠 Development Commands

### Build and Run
```sh
pnpm run build       # Build all packages
pnpm start           # Start the GitHub App (requires .env setup)
pnpm run dev:demo    # Start demo Astro development server
```

### Code Quality
```sh
pnpm run lint        # Run linter across all packages
pnpm run lint:fix    # Run linter with auto-fix across all packages
pnpm run format      # Check code formatting across all packages
pnpm run format:fix  # Format code across all packages
pnpm run check       # Run lint + format check across all packages
pnpm run check:fix   # Run lint + format with auto-fix across all packages
```

### Testing
```sh
pnpm test            # Run all tests across packages in watch mode
pnpm exec vitest run # Run tests once without watch mode (preferred for CI/development)
pnpm run ci:check    # Runs all required checks in sequence
```

### Mise Tasks (Alternative)
```sh
mise run dev         # Start development server
mise run build       # Build the project
mise run test        # Run tests
mise run lint        # Run linter
mise run format      # Format code
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

## 🧪 Test-Driven Development (TDD) Policy

**MANDATORY**: ALL new feature development and refactoring MUST follow Test-Driven Development (TDD):

### TDD Cycle (Red-Green-Refactor)
1. **Red**: Write a failing test first
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve the code while keeping tests green

### TDD Implementation Rules

#### For New Features:
1. **Start with tests**: No production code without a failing test
2. **One test at a time**: Focus on one behavior per test
3. **Minimal implementation**: Write only enough code to pass the current test
4. **Continuous refactoring**: Clean up after each green phase

#### For Bug Fixes:
1. **Write tests** that reproduce the original issue
2. **Verify the fix** resolves the issue  
3. **Ensure tests fail** without the fix (to confirm they catch the problem)
4. **Test edge cases** and related scenarios

## 📋 PR Creation Guidelines

**MANDATORY**: Before creating any Pull Request or committing changes, ALWAYS run the following commands in sequence:

```bash
pnpm run format:fix  # Fix code formatting across all packages
pnpm run lint:fix    # Fix linting issues across all packages
pnpm run build       # Check TypeScript compilation for all packages
pnpm exec vitest run # Run all tests (currently in @gitlyte/core only)
```

For convenience, you can also use the CI check command:

```bash
pnpm run ci:check    # Runs all required checks in sequence
```

**If any of these fail:**
1. Fix TypeScript compilation errors manually
2. Run `pnpm run format:fix` to auto-fix formatting across all packages
3. Run `pnpm run lint:fix` to auto-fix linting issues across all packages
4. Manually fix any remaining issues
5. Re-run the checks until all pass

This ensures code quality and prevents CI/CD failures across the entire workspace.

## 🔄 Submitting a Pull Request

1. [Fork][fork] and clone the repository
2. Set up development environment (see above)
3. Create a new branch: `git checkout -b my-branch-name`
4. Follow TDD process for your changes
5. Ensure all tests pass and code quality checks pass
6. Push to your fork and [submit a pull request][pr]
7. Pat yourself on the back and wait for review

Here are a few things you can do that will increase the likelihood of your pull request being accepted:

- Follow TDD and write comprehensive tests
- Keep your changes as focused as possible
- Write a [good commit message](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)
- Ensure all CI checks pass

Work in Progress pull requests are also welcome to get feedback early on.

## 🏗 Architecture Overview

GitLyte uses a three-stage AI pipeline:

### Core Flow
1. **Event Trigger**: PR with `enhancement` or `feat` label is merged
2. **AI Analysis**: Repository is analyzed using OpenAI API to determine project characteristics
3. **Design Generation**: AI creates custom design strategy (colors, typography, layout)
4. **Code Generation**: Astro components are generated with custom styling
5. **Deployment**: Files are batch-committed and deployed via GitHub Actions

### Key Components

**Event Handling**: `packages/gitlyte/handlers/pr-handler.ts` - Orchestrates the entire generation process

**AI Services**:
- `packages/gitlyte/services/ai-analyzer.ts` - Repository analysis and design strategy generation using OpenAI
- `packages/gitlyte/services/ai-code-generator.ts` - Astro component generation with custom styling
- `packages/gitlyte/services/astro-generator.ts` - Orchestrates AI generation and file deployment

**Utilities**:
- `packages/gitlyte/utils/github.ts` - GitHub API operations and repository data collection
- `packages/gitlyte/utils/batch-commit.ts` - Efficient batch file commits using GitHub Tree API

## 📚 Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)
- [Architecture Documentation](docs/ARCHITECTURE.md)
