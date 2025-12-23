# GitLyte Architecture

GitLyte is a GitHub App built with [Probot](https://github.com/probot/probot) that automatically generates AI-powered static HTML websites from repository data. This document provides a technical overview of the v2 architecture.

## System Overview

```
Push Event → Repository Analysis → AI Design Generation → HTML Creation → GitHub Commit
     ↓              ↓                    ↓                    ↓              ↓
  Default       README/Code          Multi-Provider        Tailwind      Tree API
  Branch        Analysis             AI (Claude/GPT)       CSS           Batch Commit
```

## Project Structure

GitLyte uses pnpm workspaces with two main packages:

- `@gitlyte/core` - Main GitHub App in `packages/gitlyte/`
- `@gitlyte/demo` - Demo site example in `packages/demo/`

```
packages/gitlyte/
├── index.ts                    # Probot app entry point
├── handlers/
│   └── v2-push-handler.ts      # Push event handler
├── services/
│   ├── v2-site-generator.ts    # Site generation orchestrator
│   └── self-refine.ts          # Self-Refine quality improvement
├── utils/
│   ├── ai-provider.ts          # Multi-provider AI SDK wrapper
│   ├── ai-response-cleaner.ts  # AI response sanitization
│   └── deployment-guard.ts     # Concurrent deployment prevention
├── types/
│   └── v2-config.ts            # Configuration schema
├── eval/                       # Evaluation system
│   ├── lighthouse.ts           # Lighthouse CI integration
│   ├── llm-judge.ts            # LLM-based design evaluation
│   ├── run-eval.ts             # CLI evaluation runner
│   └── benchmarks/             # Benchmark definitions
└── test/                       # Comprehensive test suites
```

## Core Flow

### 1. Push Event Trigger
- Handler receives push event to default branch
- Checks if generation is enabled in `.gitlyte.json`
- Validates commits are not from GitLyte itself (infinite loop prevention)

### 2. Repository Analysis
- Fetches README.md content
- Analyzes repository structure and metadata
- Determines project type, tech stack, and audience

### 3. Design Generation
- AI creates custom design system:
  - Color schemes
  - Typography choices
  - Layout structure
  - Component styling
- Uses Tailwind CSS classes for styling

### 4. HTML Generation
- Generates complete HTML pages with embedded Tailwind
- Creates index.html and optional additional pages
- Includes responsive design and accessibility features

### 5. Self-Refine (Optional)
When `ai.quality: "high"` is configured:
- LLM-as-Judge evaluates the generated design
- If score is below threshold, regenerates with feedback
- Iterates until quality threshold is met or max iterations reached

### 6. Deployment
- Commits files via GitHub Tree API (batch operation)
- Updates ref to new commit
- Files are immediately available on GitHub Pages

## AI Integration

### Multi-Provider Support
Uses Vercel AI SDK for provider abstraction:

| Provider | Model | Environment Variable |
|----------|-------|---------------------|
| Anthropic (default) | claude-sonnet-4-20250514 | `ANTHROPIC_API_KEY` |
| OpenAI | gpt-4o | `OPENAI_API_KEY` |
| Google | gemini-1.5-pro | `GOOGLE_GENERATIVE_AI_API_KEY` |

### Quality Modes
- **standard**: Single generation pass (fast, cost-effective)
- **high**: Self-Refine pattern with LLM-as-Judge (better quality, higher cost)

### AI Response Handling
- JSON extraction from markdown code blocks
- Validation of required fields
- Fallback to defaults on parse errors

## Configuration Schema

```typescript
interface GitLyteConfigV2 {
  enabled?: boolean;              // Enable/disable generation
  outputDirectory?: string;       // Output directory (default: "docs")
  logo?: { path: string; alt?: string };
  favicon?: { path: string };
  ai?: {
    provider?: "anthropic" | "openai" | "google";
    quality?: "standard" | "high";
  };
  pages?: ("features" | "docs" | "api" | "examples" | "changelog")[];
}
```

## Evaluation System

Located in `packages/gitlyte/eval/`:

### Components
- **Lighthouse CI**: Performance, accessibility, SEO checks
- **LLM-as-Judge**: Design quality evaluation (aesthetics, modernity, usability)
- **promptfoo**: Prompt regression testing

### Benchmarks
- GitLyte itself (self-evaluation)
- Sample repositories (CLI tool, JS library, webapp)

### CI Integration
- `.github/workflows/eval.yml` runs evaluations on relevant changes
- Reports generated as GitHub artifacts
- PR comments with evaluation summaries

## Security & Performance

### Security Measures
- API keys stored in environment variables only
- Input validation on all configuration
- Deployment guard prevents concurrent modifications

### Performance Optimizations
- Batch file commits via GitHub Tree API
- Static HTML generation (no runtime dependencies)
- Tailwind CDN for styling (no build step)

## Testing Architecture

### Test Structure
```
packages/gitlyte/test/
├── handlers/          # Handler tests
├── services/          # Service tests
├── utils/             # Utility tests
├── types/             # Type validation tests
├── eval/              # Evaluation system tests
├── integration/       # End-to-end tests
└── fixtures/          # Test data
```

### Test Approach
- Vitest for test runner
- nock for GitHub API mocking
- Mock AI responses for deterministic tests
- 214+ tests covering all functionality

## Version Management

Uses **mise** for consistent environments:
- Node.js: 20.18.0
- pnpm: 10.12.1

Configuration in `.mise.toml` ensures consistency across contributors.
