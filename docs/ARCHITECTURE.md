# GitLyte Architecture

GitLyte is a GitHub App built with [Probot](https://github.com/probot/probot) that automatically generates AI-powered static HTML websites from repository data. This document provides a detailed technical overview of the system architecture.

## 🏗 System Architecture

```
GitHub Events → AI Analysis → Custom Site Generation → GitHub Pages Deploy
     ↓             ↓              ↓                    ↓
  PR/Issue      Anthropic API   HTML/CSS/JS        Static Site
  Content       Design AI       Custom Pages       Auto-Deploy
```

## 📁 Project Structure

GitLyte uses pnpm workspaces with two main packages:

- `@gitlyte/core` - Main GitHub App in `packages/gitlyte/`
- `@gitlyte/demo` - Demo site example in `packages/demo/`

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

## 🔄 Core Flow

The architecture follows a three-stage AI pipeline:

### 1. Event Trigger
- **PR with `enhancement` or `feat` label is merged**
- **Push to main branch** (default behavior)
- **Comment commands** (`@gitlyte generate`, `@gitlyte preview`)

### 2. AI Analysis
Repository is analyzed using Anthropic Claude API to determine:
- Project type and tech stack
- Target audience
- Purpose and tone
- Design preferences

### 3. Design Generation
AI creates custom design strategy:
- Color schemes
- Typography choices
- Layout preferences
- Component styling

### 4. Code Generation
HTML pages are generated with:
- Custom styling (no templates)
- Project-specific content
- Responsive design
- Performance optimization

### 5. Deployment
Files are batch-committed and deployed:
- GitHub Tree API for efficient commits
- GitHub Actions for build and deploy
- GitHub Pages hosting

## 🎯 Key Components

### Event Handling
**File**: `packages/gitlyte/handlers/pr-handler.ts`
- Orchestrates the entire generation process
- Handles PR merge events
- Manages trigger conditions

### AI Services

#### Repository Analyzer
**File**: `packages/gitlyte/services/repository-analyzer.ts`
- Analyzes repository structure and content
- Determines project characteristics
- Generates design strategy using Anthropic Claude

#### Site Generator
**File**: `packages/gitlyte/services/site-generator.ts`
- Orchestrates AI generation process
- Manages component creation
- Handles file deployment

#### Static File Deployer
**File**: `packages/gitlyte/services/static-file-deployer.ts`
- Manages file creation and deployment
- Handles batch commits
- Sets up GitHub Pages configuration

### Utilities

#### GitHub API
**File**: `packages/gitlyte/utils/github-api.ts`
- GitHub API operations
- Repository data collection
- File management

#### Deployment Guard
**File**: `packages/gitlyte/utils/deployment-guard.ts`
- Prevents deployment conflicts
- Manages concurrent generation requests

## 🤖 AI Generation Strategy

The system uses a two-step AI approach:

### 1. Repository Analysis
**Input**: Repository metadata, files, issues, PRs
**Output**: Project analysis JSON
```json
{
  "projectType": "library",
  "techStack": ["JavaScript", "Node.js"],
  "audience": "developers",
  "tone": "professional",
  "purpose": "utility library"
}
```

### 2. Design Strategy
**Input**: Project analysis
**Output**: Design strategy JSON
```json
{
  "colors": {
    "primary": "#667eea",
    "secondary": "#764ba2",
    "accent": "#f093fb"
  },
  "typography": {
    "headingFont": "Inter",
    "bodyFont": "system-ui"
  },
  "layout": "hero-focused"
}
```

### 3. Component Generation
All Astro components are generated programmatically:
- **Layout.astro**: Base layout with custom styling
- **Hero.astro**: Hero section with project branding
- **Features.astro**: Feature showcase
- **index.astro**: Main page with project data

## 🔗 GitHub Integration

### Required Permissions
- **Contents**: Write (file creation)
- **Issues**: Read (data collection)
- **Metadata**: Read (repository info)
- **Pages**: Write (GitHub Pages setup)
- **Pull requests**: Read (PR data)
- **Actions**: Write (workflow creation)

### Event Subscriptions
- **Pull request**: `pull_request.closed` events
- **Issue comment**: For command processing

### File Deployment Strategy
1. **Batch Commits**: Uses GitHub Tree API to commit multiple files in single operation
2. **Conflict Prevention**: Deployment guard prevents concurrent modifications
3. **GitHub Actions**: Automatic build and deploy workflows
4. **GitHub Pages**: Static site hosting from `docs/` directory

## 🛡 Security & Performance

### Security Measures
- **API Key Management**: OpenAI API keys stored in environment variables
- **GitHub App Authentication**: Private key-based authentication
- **Input Validation**: All user inputs and API responses validated
- **Rate Limiting**: Respects GitHub and OpenAI API rate limits

### Performance Optimizations
- **Batch Operations**: Multiple file commits in single API call
- **Concurrent Processing**: Parallel AI API calls where possible
- **Static Generation**: Pure HTML/CSS output (no runtime dependencies)
- **Efficient Caching**: Repository data cached during generation

## 🧪 Testing Architecture

### Test Structure
```
packages/gitlyte/test/
├── services/           # Service layer tests
├── utils/             # Utility function tests
├── templates/         # Template generation tests
├── integration/       # End-to-end tests
└── fixtures/          # Test data and mocks
```

### Test Categories
- **Unit Tests**: Individual service and utility functions
- **Integration Tests**: End-to-end generation workflows
- **AI Tests**: Mock OpenAI API responses
- **GitHub Tests**: Mock GitHub API interactions

### Test Coverage
- 392+ tests covering all functionality
- Comprehensive mocking for external APIs
- TDD-driven development process

## 🔄 Build Process

### Development
1. **TypeScript Compilation**: `pnpm run build` - builds all workspace packages
2. **Test Execution**: `pnpm test` - runs all tests in watch mode
3. **Code Quality**: `pnpm run lint` and `pnpm run format` - ensures code quality

### Production
1. **Compilation**: Generates `packages/gitlyte/lib/` directory with compiled JavaScript
2. **Probot Execution**: Runs compiled code from the gitlyte package
3. **Site Generation**: Generated Astro sites built and deployed via GitHub Actions
4. **Demo Development**: `pnpm run dev:demo` for independent demo development

## 🌐 Version Management

This project uses **mise** for consistent environment management:
- **Node.js**: 20.18.0
- **pnpm**: 10.12.1

Configuration in `.mise.toml` ensures consistent development environments across contributors.

## 📊 Monitoring & Observability

### Logging
- Structured logging throughout the application
- Request tracing for debugging
- Error reporting with context

### Metrics
- Generation success/failure rates
- AI API response times
- GitHub API usage tracking

### Health Checks
- Service availability monitoring
- Dependency health verification
- Performance baseline tracking

## 🔮 Future Architecture Considerations

### Scalability
- **Horizontal Scaling**: Multi-instance deployment support
- **Queue System**: Background job processing for large repositories
- **Caching Layer**: Redis for improved performance

### Extensibility
- **Plugin System**: Support for custom generation plugins
- **Template Engine**: User-defined template support
- **AI Model Selection**: Support for multiple AI providers

### Reliability
- **Circuit Breakers**: Fault tolerance for external API failures
- **Retry Logic**: Exponential backoff for transient failures
- **Graceful Degradation**: Fallback behavior when AI services unavailable