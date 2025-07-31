# AI-Commit

> AI-powered git commit message generator with multiple providers and advanced features

AI-Commit is a powerful CLI tool that automatically generates meaningful commit messages using AI. It supports multiple AI providers (OpenRouter, OpenAI, Anthropic) and offers various commit styles including Conventional Commits.

## Features

- **Multiple AI Providers**: Support for OpenRouter, OpenAI, and Anthropic
- **Conventional Commits**: Generate standardized commit messages
- **Flexible Configuration**: Customizable prompts, models, and settings
- **Multiple Commit Styles**: Conventional, Simple, and Detailed formats
- **Auto-staging**: Automatically stage changes before committing
- **Smart Diff Analysis**: Intelligent parsing of git changes
- **Multi-language Support**: Generate commit messages in different languages
- **Fast & Lightweight**: Built with Node.js for optimal performance

## Quick Start

### Installation

#### Option 1: Using the Installer Script
```bash
# Clone the repository
git clone https://github.com/baiyuechuu/AI-Commit.git
cd AI-Commit

# Run the installer
chmod +x install.sh
./install.sh
```

#### Option 2: Manual Installation
```bash
# Clone the repository
git clone https://github.com/baiyuechuu/AI-Commit.git
cd AI-Commit

# Install dependencies
npm install

# Make executable
chmod +x aicommit.js

# Add to PATH (optional)
sudo ln -s $(pwd)/aicommit.js /usr/local/bin/aicommit
```

### Basic Usage

1. **Set up your API key** (choose one provider):
   ```bash
   # For OpenRouter (recommended)
   export OPENROUTER_API_KEY="your-api-key"
   
   # For OpenAI
   export OPENAI_API_KEY="your-api-key"
   
   # For Anthropic
   export ANTHROPIC_API_KEY="your-api-key"
   ```

2. **Generate a commit message**:
   ```bash
   aicommit
   ```

3. **Or with options**:
   ```bash
   aicommit --provider openrouter --model google/gemini-flash-1.5-8b
   ```

## Commands

### Basic Commands
```bash
aicommit                    # Generate commit message with default settings
aicommit --help            # Show help information
aicommit --version         # Show version
```

### Configuration Commands
```bash
aicommit config            # Interactive configuration setup
aicommit config --show     # Display current configuration
aicommit rules             # Show commit message rules
```

### Advanced Options
```bash
aicommit --provider openrouter    # Specify AI provider
aicommit --model gpt-4o-mini      # Specify AI model
aicommit --style conventional     # Specify commit style
aicommit --no-confirm            # Skip confirmation prompt
aicommit --push                  # Push after commit
aicommit --language zh           # Generate in Chinese
```

## ⚙️ Configuration

The tool creates a configuration file at `~/.aicommit.json`. You can configure:

### AI Providers
- **OpenRouter** (default): Access to multiple AI models
- **OpenAI**: Direct OpenAI API access
- **Anthropic**: Claude models

### Models
- **OpenRouter**: `google/gemini-flash-1.5-8b`, `anthropic/claude-3-haiku`, `openai/gpt-4o-mini`
- **OpenAI**: `gpt-4o-mini`, `gpt-4o`, `gpt-3.5-turbo`
- **Anthropic**: `claude-3-haiku-20240307`, `claude-3-sonnet-20240229`

### Commit Styles
- **Conventional**: Standard format with type, scope, and description
- **Simple**: Clean format following 50/72 rule
- **Detailed**: Comprehensive format for complex changes

### Example Configuration
```json
{
  "provider": "openrouter",
  "model": "google/gemini-flash-1.5-8b",
  "temperature": 0.3,
  "maxTokens": 300,
  "commitStyle": "conventional",
  "autoStage": true,
  "confirmBeforeCommit": true,
  "language": "en"
}
```

## 📝 Examples

### Conventional Commits
```
feat(auth): add OAuth2 login support

- implement Google OAuth2 integration
- add user session management
- create secure token handling

This allows users to sign in using their Google accounts
instead of creating separate credentials.

Closes #123
```

### Simple Commits
```
Add user authentication system

- implement OAuth2 authentication with Google provider
- create user session management
- add secure token handling

Users can now sign in using their Google accounts.
```

### Detailed Commits
```
feat(auth): add OAuth2 login system

- implement comprehensive authentication system
- add Google OAuth2 integration
- create user session management
- add secure token handling

This replaces the old password-based system and provides
better security and user experience.

BREAKING CHANGE: removes legacy auth endpoints
Closes #123, #124
```

## 🔧 Advanced Features

### Custom Prompts
You can customize the AI prompt by setting a custom prompt in the configuration:

```bash
aicommit config
# Follow the prompts to set custom prompt
```

### Language Support
Generate commit messages in different languages:

```bash
aicommit --language zh  # Chinese
aicommit --language es  # Spanish
aicommit --language fr  # French
```

### Context Inclusion
The tool automatically includes relevant context like:
- File changes and their types
- Diff statistics
- Repository information
- Recent commit history

### Validation
Commit messages are validated against:
- Conventional Commits specification
- Length limits (50/72 rule)
- Format requirements
- Content quality checks

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Clone the repository
git clone https://github.com/baiyuechuu/AI-Commit.git
cd AI-Commit

# Install dependencies
npm install

# Make executable
chmod +x aicommit.js

# Run in development mode
npm run dev
```

### Scripts
```bash
npm start          # Run the application
npm run dev        # Run with nodemon for development
npm run build      # Build executable with pkg
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

- [Conventional Commits](https://www.conventionalcommits.org/) for the commit message specification
- [OpenRouter](https://openrouter.ai/) for providing access to multiple AI models
- [Commander.js](https://github.com/tj/commander.js) for CLI framework
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) for interactive prompts

## Support

- **Issues**: [GitHub Issues](https://github.com/baiyuechuu/AI-Commit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/baiyuechuu/AI-Commit/discussions)
---

Made with ❤️ by [baiyuechuu](https://github.com/baiyuechuu)
