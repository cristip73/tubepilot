# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in TubePilot, please report it responsibly:

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email the maintainer directly or use GitHub's private vulnerability reporting
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Best Practices

TubePilot follows these security practices:

### Input Validation
- All user inputs are validated using Zod schemas
- String lengths are constrained to prevent abuse
- Video/channel/playlist IDs are validated against expected formats

### Secrets Management
- API keys are loaded from environment variables only
- Secrets are never logged or exposed in error messages
- No secrets are accepted as tool arguments

### Network Security
- All YouTube API calls use HTTPS
- Request timeouts prevent indefinite hangs
- No arbitrary URL fetching from user input

### Error Handling
- Internal errors are sanitized before returning to clients
- Stack traces are never exposed to end users
- Errors are logged internally for debugging

## Security Considerations for Users

1. **API Key Protection**: Store your YouTube API key securely. Never commit it to version control.

2. **Claude Desktop Config**: The `claude_desktop_config.json` file contains your API key. Ensure it has appropriate file permissions.

3. **Rate Limits**: YouTube API has quota limits. TubePilot caches responses to minimize API calls, but be aware of your quota usage.

## Dependencies

We regularly update dependencies to patch known vulnerabilities. Run `npm audit` to check for issues.
