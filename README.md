# AI Commit

🤖 AI-powered git commit message generator that creates meaningful, conventional commits automatically.

## Features

- **Smart Analysis** - Analyzes your staged changes and generates contextual commit messages
- **Interactive Flow** - Preview, edit, or regenerate messages before committing
- **Conventional Commits** - Follows conventional commit standards with proper type detection
- **Multiple AI Providers** - Supports OpenAI, Anthropic, and OpenRouter
- **Beautiful UI** - Clean, colorful terminal interface with organized change display

## Quick Start

```bash
# Install
npm install -g aicommit-js

# Configure (first time only)
aicommit config

# Use
git add .
aicommit
```

## How It Works

1. **Stage your changes** with `git add`
2. **Run aicommit** - it analyzes your changes and generates a commit message
3. **Review the message** - see exactly what will be committed
4. **Choose action**: Commit, Edit, Regenerate, or Cancel
5. **Done!** - your changes are committed with a professional message

## Configuration

Set up your AI provider:

```bash
aicommit config
```

You'll be prompted to configure:
- AI Provider (OpenAI, Anthropic, OpenRouter)
- API Key
- Commit style (conventional, simple, detailed)
- Other preferences

## Examples

**Input**: Modified authentication logic
**Output**: 
```
fix(auth): resolve token validation error

- Fix JWT token expiration check
- Update error handling for invalid tokens
- Improve security validation flow
```

**Input**: Added new user dashboard
**Output**:
```
feat(ui): add user dashboard with analytics

- Create dashboard component with charts
- Add user statistics and activity tracking  
- Implement responsive design for mobile
```

## Commands

- `aicommit` - Generate and commit (default)
- `aicommit config` - Configure settings
- `aicommit show-config` - View current configuration
- `aicommit rules` - Show commit message best practices
- `aicommit reset-config` - Reset to defaults

## License

MIT
