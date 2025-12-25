# Contributing to GitLyte

[fork]: /fork
[pr]: /compare
[code-of-conduct]: CODE_OF_CONDUCT.md

Hi there! We're thrilled that you'd like to contribute to this project. Your help is essential for keeping it great.

Please note that this project is released with a [Contributor Code of Conduct][code-of-conduct]. By participating in this project you agree to abide by its terms.

## Development Setup

### Prerequisites
- Node.js 24.12.0+ (managed via mise)
- pnpm 10.25.0+ (managed via mise)
- API key for AI provider (Anthropic, OpenAI, or Google)

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

# Add your API key to .env (choose one)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
# or OPENAI_API_KEY=your_openai_api_key_here
# or GOOGLE_API_KEY=your_google_api_key_here

# Run the bot
pnpm start
```

## Development Commands

### Build and Run
```sh
pnpm run build       # Build all packages
pnpm start           # Start the GitHub App (requires .env setup)
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

## Project Structure

```
packages/
└── gitlyte/                    # Main GitHub App
    ├── index.ts                   # Probot app entry point
    ├── handlers/
    │   ├── v2-push-handler.ts     # Push event handler (auto mode)
    │   └── v2-comment-handler.ts  # Comment command handler (@gitlyte commands)
    ├── services/
    │   ├── v2-site-generator.ts   # Site generation orchestrator
    │   ├── section-generator.ts   # Section-based parallel generation
    │   └── self-refine.ts         # Self-Refine quality improvement
    ├── utils/
    │   ├── ai-provider.ts         # Multi-provider AI SDK wrapper
    │   ├── ai-response-cleaner.ts # AI response sanitization
    │   └── deployment-guard.ts    # Concurrent deployment prevention
    ├── types/
    │   └── v2-config.ts           # Configuration schema
    ├── eval/                      # Evaluation system
    │   ├── index.ts               # Main evaluation entry point
    │   ├── lighthouse.ts          # Lighthouse CI integration
    │   ├── llm-judge.ts           # LLM-based design evaluation
    │   ├── run-eval.ts            # CLI evaluation runner
    │   └── benchmarks/            # Benchmark definitions
    └── test/                      # Comprehensive test suites
```

## Test-Driven Development (TDD) Policy

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

## PR Creation Guidelines

**MANDATORY**: Before creating any Pull Request or committing changes, ALWAYS run the following commands in sequence:

```bash
pnpm run format:fix  # Fix code formatting across all packages
pnpm run lint:fix    # Fix linting issues across all packages
pnpm run build       # Check TypeScript compilation for all packages
pnpm exec vitest run # Run all tests
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

## Submitting a Pull Request

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

## Architecture Overview

GitLyte uses AI to generate custom websites from repository data.

### Trigger Modes
- **Manual** (default): Generate via `@gitlyte generate` command in Issue/PR comments
- **Auto**: Generate on every push to default branch

### Core Flow (v2)
1. **Trigger**: Push event (auto mode) or comment command (manual mode)
2. **Repository Analysis**: README and repository metadata are analyzed
3. **Design Generation**: AI creates custom design system with Tailwind CSS
4. **Section Generation**: Parallel generation of sections (hero, features, etc.)
5. **Self-Refine** (optional): Quality improvement through iterative refinement
6. **Deployment**: Creates branch and opens PR via GitHub API (batch commit via Tree API)

### Key Components

**Event Handling**:
- `packages/gitlyte/handlers/v2-push-handler.ts` - Handles push events (auto mode)
- `packages/gitlyte/handlers/v2-comment-handler.ts` - Handles @gitlyte commands (manual mode)

**Services**:
- `packages/gitlyte/services/v2-site-generator.ts` - Site generation orchestrator
- `packages/gitlyte/services/section-generator.ts` - Section-based parallel generation
- `packages/gitlyte/services/self-refine.ts` - Self-Refine pattern implementation

**AI Integration**:
- `packages/gitlyte/utils/ai-provider.ts` - Multi-provider support (Anthropic, OpenAI, Google)

**Utilities**:
- `packages/gitlyte/utils/deployment-guard.ts` - Prevents concurrent deployments

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)
- [Architecture Documentation](docs/ARCHITECTURE.md)
- [Security Policy](SECURITY.md)
- [Changelog](CHANGELOG.md)
