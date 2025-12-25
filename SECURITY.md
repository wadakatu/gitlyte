# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do NOT create a public GitHub issue** for security vulnerabilities
2. **Email the maintainers directly** or use GitHub's private vulnerability reporting feature
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (if applicable)

### What to Expect

- **Acknowledgment**: We will acknowledge your report within 48 hours
- **Updates**: We will provide updates on the progress of fixing the vulnerability
- **Resolution**: We aim to resolve critical vulnerabilities within 7 days
- **Credit**: We will credit you in the security advisory (unless you prefer to remain anonymous)

## Security Best Practices

When using GitLyte, please follow these security practices:

### API Keys
- Store API keys in environment variables only
- Never commit API keys to your repository
- Use `.env` files locally (ensure `.env` is in `.gitignore`)
- Rotate API keys periodically

### Configuration
- Review `.gitlyte.json` configuration before deployment
- Validate that `outputDirectory` is set appropriately
- Be cautious with `generation.trigger: "auto"` on repositories with external contributors

### Generated Content
- Review generated site content before merging PRs
- Generated sites are static HTML with no server-side execution
- All generated content uses Tailwind CSS via CDN

## Security Measures in GitLyte

### Input Validation
- All configuration values are validated against a strict schema
- Invalid configuration results in clear error messages
- Unknown configuration fields trigger warnings

### Deployment Safety
- Deployment guard prevents concurrent modifications
- Infinite loop prevention (skips commits from GitLyte itself)
- Pull Request workflow enables human review before deployment

### AI Integration
- API keys are never logged or exposed
- AI responses are sanitized before use
- Fallback to safe defaults on AI response errors
