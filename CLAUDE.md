# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm run build

# Run tests (watch mode)
pnpm test

# Run tests once (CI mode)
pnpm exec vitest run

# Run a single test file
pnpm exec vitest run path/to/test.test.ts

# Lint code
pnpm run lint
pnpm run lint:fix

# Format code
pnpm run format
pnpm run format:fix

# CI check (build + format + lint + tests)
pnpm run ci:check

# Start the Probot app
pnpm run start

# Run evaluation
node --loader ts-node/esm packages/gitlyte/eval/run-eval.ts --help
```

## Architecture Overview

GitLyte is a GitHub App built with Probot that automatically generates static websites from repository data using AI (Anthropic, OpenAI, or Google).

### Monorepo Structure
- `packages/gitlyte/` - Main GitHub App (`@gitlyte/core`)
- `packages/demo/` - Demo site example (`@gitlyte/demo`)

### Core Flow (v2)
1. **Push Handler** (`handlers/v2-push-handler.ts`) receives push events to default branch
2. **Site Generator** (`services/v2-site-generator.ts`) orchestrates the generation:
   - Analyzes repository (README, structure, tech stack)
   - Generates design system with AI
   - Creates HTML with Tailwind CSS
3. **Self-Refine** (`services/self-refine.ts`) optionally improves quality through iterative refinement
4. **Deployment** commits files via GitHub Tree API

### Key Files
- `packages/gitlyte/index.ts` - Probot app entry point
- `packages/gitlyte/handlers/v2-push-handler.ts` - Push event handler
- `packages/gitlyte/services/v2-site-generator.ts` - Site generation orchestrator
- `packages/gitlyte/services/self-refine.ts` - Self-Refine pattern implementation
- `packages/gitlyte/utils/ai-provider.ts` - Multi-provider AI SDK wrapper
- `packages/gitlyte/types/v2-config.ts` - Configuration schema (`.gitlyte.json`)

### Generation Trigger
- **Push to default branch**: Only trigger - simple and predictable

### AI Integration
Uses Vercel AI SDK for multi-provider support:
- **Anthropic**: `claude-sonnet-4-20250514` (default)
- **OpenAI**: `gpt-4o`
- **Google**: `gemini-1.5-pro`

Quality modes:
- `standard`: Single generation pass
- `high`: Self-Refine pattern with LLM-as-Judge evaluation

### Evaluation System
Located in `packages/gitlyte/eval/`:
- `lighthouse.ts` - Lighthouse CI integration
- `llm-judge.ts` - LLM-based design quality evaluation
- `run-eval.ts` - CLI for running evaluations
- `benchmarks/` - Benchmark repository definitions
- `promptfoo.yaml` - Prompt regression testing

## Testing

Tests use Vitest with:
- `nock` for mocking GitHub API
- Mock responses for AI providers

Test files are in `packages/gitlyte/test/` with the pattern `*.test.ts`.

## Code Style

Uses Biome for linting and formatting:
- 2-space indentation
- Double quotes
- Semicolons required
- ES5 trailing commas
- `noExplicitAny` enforced (except in test files)
