# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
pnpm install

# Build (bundle with ncc)
pnpm run build

# Lint code
pnpm run lint
pnpm run lint:fix

# Format code
pnpm run format
pnpm run format:fix

# CI check (build + format + lint)
pnpm run ci:check
```

## Architecture Overview

GitLyte is a GitHub Action that automatically generates static websites from repository data using AI (Anthropic, OpenAI, or Google).

### Project Structure

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

### Key Files

- `action.yml` - GitHub Action metadata and inputs/outputs
- `src/index.ts` - Main entry point, handles inputs and orchestrates generation
- `src/ai-provider.ts` - Multi-provider AI abstraction (Anthropic, OpenAI, Google)
- `src/site-generator.ts` - Site generation logic (analysis, design, HTML)

### How It Works

1. **Input Validation** - Validates API key, provider, quality mode
2. **Repository Analysis** - Fetches repo metadata and README via GitHub API
3. **Config Loading** - Loads `.gitlyte.json` if present
4. **AI Analysis** - Analyzes repository purpose, audience, style
5. **Design Generation** - Creates color palette and typography
6. **HTML Generation** - Generates landing page with Tailwind CSS
7. **File Output** - Writes generated files to output directory

### AI Integration

Uses Vercel AI SDK for multi-provider support:

| Provider | Model | Default |
|----------|-------|---------|
| Anthropic | claude-sonnet-4-20250514 | Yes |
| OpenAI | gpt-4o | No |
| Google | gemini-2.0-flash | No |

### Configuration

Users can customize via `.gitlyte.json`:

```json
{
  "enabled": true,
  "outputDirectory": "docs",
  "theme": { "mode": "dark" },
  "prompts": { "siteInstructions": "..." }
}
```

## Building

The action is bundled using `@vercel/ncc`:

```bash
pnpm run build
```

This creates a single-file bundle in `dist/index.js` that includes all dependencies.

## Code Style

Uses Biome for linting and formatting:
- 2-space indentation
- Double quotes
- Semicolons required
- ES5 trailing commas
- `noExplicitAny` enforced
