# Contributing to TubePilot

Thanks for your interest in contributing to TubePilot!

## Quick Links
- **GitHub:** https://github.com/ixex/tubepilot
- **Issues:** https://github.com/ixex/tubepilot/issues

## How to Contribute

1. **Bug fixes** → Open a PR with a clear description
2. **New features** → Open an issue first to discuss
3. **Documentation** → PRs welcome!

## Development Setup

```bash
# Clone the repo
git clone https://github.com/ixex/tubepilot.git
cd tubepilot

# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

## Before You PR

- [ ] Run `npm run build` to ensure TypeScript compiles
- [ ] Run `npm test` to ensure tests pass
- [ ] Run `npm run format` to format code
- [ ] Keep PRs focused (one thing per PR)
- [ ] Write a clear description of what and why

## Code Style

- We use TypeScript with strict mode
- Format with Prettier (run `npm run format`)
- Use meaningful variable/function names
- Add JSDoc comments for public APIs

## Commit Messages

We use conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `refactor:` - Code refactoring
- `security:` - Security improvements

## Testing

Tests are written with Vitest. Run them with:

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
```

## Questions?

Open an issue or start a discussion on GitHub!
