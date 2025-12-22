# GitLyte v2 Specification

> Instantly turn your GitHub repo into a live website with AI-powered design - no code needed.

## Overview

GitLyte v2 is a complete redesign focused on simplicity, design quality, and developer experience.

## Core Principles

1. **Zero Configuration**: Works out of the box
2. **AI-First Design**: Every site is unique, tailored to the repository
3. **Quality Over Features**: MVP with excellent execution

## Trigger

| Item | Specification |
|------|---------------|
| Trigger | Push to default branch only |
| Disable | `enabled: false` in `.gitlyte.json` |
| Deploy | GitHub Pages |

## Tech Stack

| Item | Choice |
|------|--------|
| AI Library | Vercel AI SDK |
| Providers | Anthropic / OpenAI / Google (user choice) |
| API Key | User sets in GitHub Secrets |
| Styling | Tailwind CDN (no build step) |
| Output | Static HTML/CSS/JS |

## Generation

| Item | Specification |
|------|---------------|
| Default | TOP page only |
| Multiple Pages | Configurable via `.gitlyte.json` |
| Quality Mode | `standard` (single pass) / `high` (Self-Refine) |
| Design | AI auto-determines based on repository analysis |

## Configuration Schema

`.gitlyte.json`:

```json
{
  "enabled": true,
  "outputDirectory": "docs",
  "logo": {
    "path": "./assets/logo.svg",
    "alt": "Project Logo"
  },
  "favicon": {
    "path": "./assets/favicon.ico"
  },
  "ai": {
    "provider": "anthropic",
    "quality": "standard"
  },
  "pages": ["features", "docs"]
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable generation |
| `outputDirectory` | string | `"docs"` | Output directory for generated files |
| `logo.path` | string | - | Path to logo image |
| `logo.alt` | string | - | Alt text for logo |
| `favicon.path` | string | - | Path to favicon |
| `ai.provider` | string | `"anthropic"` | AI provider (`anthropic`, `openai`, `google`) |
| `ai.quality` | string | `"standard"` | Quality mode (`standard`, `high`) |
| `pages` | string[] | `[]` | Additional pages to generate |

### GitHub Secrets

Users must set one of the following based on their chosen provider:

- `ANTHROPIC_API_KEY` - For Anthropic Claude
- `OPENAI_API_KEY` - For OpenAI GPT
- `GOOGLE_API_KEY` - For Google Gemini

## Quality Modes

### Standard Mode (Default)
- Single generation pass
- Lower API cost
- Fast generation

### High Mode (Self-Refine)
- Generate → Evaluate → Refine cycle
- Higher API cost
- Better design quality
- Research shows ~8.7% improvement in code quality

## Development Evaluation System

CI/CD pipeline for quality assurance:

```
Push → Generate → Evaluate → Report
                     │
           ┌─────────┴─────────┐
           │                   │
      Lighthouse          LLM as Judge
    (Technical Quality)  (Design Quality)
           │                   │
           └─────────┬─────────┘
                     │
                promptfoo
           (Prompt Evaluation)
```

### Tools

| Tool | Purpose |
|------|---------|
| Lighthouse CI | Performance, Accessibility, SEO scoring |
| LLM as Judge | Design quality evaluation (aesthetics, repository fit) |
| promptfoo | A/B testing for prompt improvements |

### Benchmark Repositories

- **GitLyte itself**: Main benchmark
- **Sample repositories**:
  - OSS CLI tool
  - Web app / SaaS
  - Library / SDK
  - Documentation site

## Removed Features (from v1)

- Label-based triggers (`gitlyte`, `gitlyte:preview`)
- Comment commands (`@gitlyte generate`, etc.)
- Preview mode
- Manual theme/layout configuration (now AI auto-determined)

## User Flow

```
1. Install GitLyte GitHub App
2. (Optional) Add .gitlyte.json for customization
3. Set API key in GitHub Secrets
4. Push code to default branch
5. Site is automatically generated and deployed
```

## Generated Output

```
docs/                    # Or configured outputDirectory
├── index.html          # Main page (always generated)
├── features.html       # If specified in pages[]
├── docs.html           # If specified in pages[]
└── assets/
    └── ...             # Logo, favicon if configured
```

## Future Considerations

- GitHub Marketplace billing (GitLyte-provided API keys)
- More quality levels (`ultra` with multiple refinement passes)
- Additional AI providers
- Custom component injection
