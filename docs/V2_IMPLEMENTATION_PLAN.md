# GitLyte v2 Implementation Plan

## Overview

This document outlines the implementation plan for migrating GitLyte from v1 to v2.

## Change Summary

| Category | Delete | Modify | Add |
|----------|--------|--------|-----|
| Handlers | `comment-handler.ts`, `pr-handler.ts`, `installation-handler.ts` | `push-handler.ts` | - |
| Services | Most of `trigger-controller.ts` | `site-generator.ts`, `configuration-loader.ts` | `self-refine.ts` |
| Utils | - | `anthropic-client.ts` → AI SDK | `ai-provider.ts` |
| Templates | `templates/css/` | `templates/html/` | Tailwind CDN support |
| Eval | - | - | `eval/` (Lighthouse, LLM Judge, promptfoo) |

## Phase Structure

```
Phase 0: Preparation & Evaluation Foundation
    ↓
Phase 1: Core Features (MVP)
    ↓
Phase 2: AI Enhancement (Self-Refine, Multi-provider)
    ↓
Phase 3: Evaluation System Integration
    ↓
Phase 4: Cleanup & Documentation
```

---

## Phase 0: Preparation & Evaluation Foundation

**Goal**: Establish quality measurement capabilities first

### Tasks

1. **Create evaluation directory structure**
   ```
   packages/gitlyte/eval/
   ├── lighthouse.ts      # Lighthouse CI integration
   ├── llm-judge.ts       # Design quality evaluation
   ├── promptfoo.yaml     # Prompt evaluation config
   └── benchmarks/        # Benchmark repository definitions
   ```

2. **Prepare benchmark repositories**
   - GitLyte itself
   - 2-3 sample repositories (OSS tool, library, etc.)

3. **CI/CD evaluation workflow**
   - `.github/workflows/eval.yml`

### Deliverables
- [x] `eval/` directory with basic structure
- [x] Benchmark repository list
- [x] GitHub Actions workflow for evaluation

---

## Phase 1: Core Features (MVP)

**Goal**: Minimal working version

### Tasks

1. **Config schema overhaul** (`types/config.ts`)
   ```typescript
   interface GitLyteConfig {
     enabled?: boolean
     outputDirectory?: string
     logo?: { path: string; alt: string }
     favicon?: { path: string }
     ai?: {
       provider: "anthropic" | "openai" | "google"
       quality: "standard" | "high"
     }
     pages?: string[]
   }
   ```

2. **AI SDK integration** (`utils/ai-provider.ts`)
   - Install Vercel AI SDK
   - Multi-provider support
   - Replace existing `anthropic-client.ts`

3. **Handler simplification**
   - `push-handler.ts`: Default branch only
   - Delete other handlers

4. **Site generation with Tailwind CDN**
   - Modify `site-generator.ts`
   - Remove CSS generation logic
   - Style with Tailwind classes

5. **Trigger logic simplification**
   - Drastically reduce `trigger-controller.ts`

### Deliverables
- [x] New config schema
- [x] AI SDK integration working
- [x] Push handler (default branch only)
- [x] Tailwind CDN-based site generation
- [x] Simplified trigger logic

---

## Phase 2: AI Enhancement

**Goal**: Improve generation quality

### Tasks

1. **Self-Refine implementation** (`services/self-refine.ts`)
   ```typescript
   async function refineGeneration(initial: GeneratedSite): Promise<GeneratedSite> {
     const evaluation = await evaluateDesign(initial)
     if (evaluation.score >= threshold) return initial
     return await regenerateWithFeedback(initial, evaluation)
   }
   ```

2. **LLM as Judge integration**
   - Create design evaluation prompts
   - Evaluation criteria: aesthetics, modernity, repository fit

3. **Prompt improvements**
   - Repository analysis prompts
   - HTML generation prompts (Tailwind class instructions)

### Deliverables
- [x] Self-Refine service
- [x] LLM as Judge evaluation
- [x] Improved prompts for Tailwind generation

---

## Phase 3: Evaluation System Integration

**Goal**: Automated quality assurance in CI/CD

### Tasks

1. **Lighthouse CI integration**
   - Performance thresholds
   - Accessibility checks
   - SEO checks

2. **promptfoo integration**
   - Regression tests for prompt changes
   - A/B testing configuration

3. **Evaluation report generation**
   - GitHub Actions report output
   - PR comment with scores (optional)

### Deliverables
- [x] Lighthouse CI configuration
- [x] promptfoo configuration
- [x] Automated evaluation reports

---

## Phase 4: Cleanup & Documentation

**Goal**: Remove unused code, update documentation

### Tasks

1. **Delete unused code**
   - `handlers/comment-handler.ts`
   - `handlers/pr-handler.ts`
   - `handlers/installation-handler.ts`
   - `templates/css/`
   - Unused trigger logic

2. **Update documentation**
   - `README.md` overhaul
   - `CLAUDE.md` update
   - Delete old documentation

3. **Update tests**
   - Delete tests for removed features
   - Add tests for new features

### Deliverables
- [x] Clean codebase
- [x] Updated README.md
- [x] Updated test suite

---

## Dependencies

```bash
# Production dependencies
pnpm add ai @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/google

# Development dependencies
pnpm add -D @lhci/cli promptfoo
```

---

## File Changes Summary

### New Files
```
packages/gitlyte/
├── eval/
│   ├── lighthouse.ts
│   ├── llm-judge.ts
│   ├── promptfoo.yaml
│   └── benchmarks/
├── services/
│   └── self-refine.ts
└── utils/
    └── ai-provider.ts
```

### Modified Files
```
packages/gitlyte/
├── index.ts                    # Remove unused handler registrations
├── handlers/
│   └── push-handler.ts         # Simplify to default branch only
├── services/
│   ├── trigger-controller.ts   # Drastically simplify
│   ├── site-generator.ts       # Tailwind CDN support
│   └── configuration-loader.ts # New schema support
├── types/
│   └── config.ts               # New simplified schema
└── templates/
    └── html/                   # Tailwind class-based templates
```

### Deleted Files
```
packages/gitlyte/
├── handlers/
│   ├── comment-handler.ts
│   ├── pr-handler.ts
│   └── installation-handler.ts
├── templates/
│   └── css/
└── utils/
    └── anthropic-client.ts     # Replaced by ai-provider.ts
```

---

## Success Criteria

### Phase 0
- Evaluation pipeline runs in CI
- Baseline scores recorded

### Phase 1
- Push to default branch triggers generation
- Site generated with Tailwind CDN
- Multiple AI providers work

### Phase 2
- Self-Refine improves design quality
- LLM as Judge provides consistent scores

### Phase 3
- All evaluations run automatically
- Quality regressions are caught

### Phase 4
- No dead code
- Documentation matches implementation
- All tests pass

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI SDK migration breaks existing functionality | Keep `anthropic-client.ts` until Phase 4 |
| Tailwind CDN affects load performance | Monitor Lighthouse scores |
| Self-Refine increases API costs | Make it opt-in via `quality: "high"` |
| Evaluation flakiness | Use deterministic prompts, set temperature to 0 for evaluation |

---

## Timeline

No specific dates - work through phases sequentially. Each phase should be completed and verified before moving to the next.
