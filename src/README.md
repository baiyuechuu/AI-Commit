# AICommit Source Code Structure

This directory contains the modular source code for the AICommit tool, organized for better maintainability and separation of concerns.

## File Structure

### Core Modules

- **`constants.js`** - Configuration constants, enums, and default values
- **`config.js`** - Configuration management (loading, saving, updating settings)
- **`git.js`** - Git operations (staging, committing, diff generation)
- **`ai.js`** - AI service integration (API calls, prompt generation, validation)
- **`rules.js`** - Commit message rules and best practices display
- **`aicommit.js`** - Main orchestrator class that coordinates all modules
- **`cli.js`** - Command-line interface setup and command parsing
- **`index.js`** - Module exports for clean imports

## Module Responsibilities

### `constants.js`
- Default configuration values
- AI provider configurations
- Commit style definitions
- Commit message rules and formatting guidelines

### `config.js` (ConfigManager)
- Load and save configuration files
- Interactive configuration setup
- Configuration display and validation
- Reset configuration to defaults

### `git.js` (GitManager)
- Git repository operations
- Change detection and staging
- Commit execution
- Diff formatting and display

### `ai.js` (AIService)
- AI API integration
- Prompt generation and formatting
- Commit message validation
- Response cleaning and processing

### `rules.js` (RulesManager)
- Display commit message best practices
- Show formatting rules and examples
- Provide guidance for different commit styles

### `aicommit.js` (AICommit)
- Main application orchestrator
- Coordinates between all modules
- Handles the main workflow
- Manages user interactions

### `cli.js`
- Command-line interface setup
- Command parsing and routing
- Error handling for CLI operations

## Benefits of This Structure

1. **Separation of Concerns** - Each module has a specific responsibility
2. **Maintainability** - Easier to locate and modify specific functionality
3. **Testability** - Individual modules can be tested in isolation
4. **Reusability** - Modules can be imported and used independently
5. **Scalability** - New features can be added as separate modules

## Usage

The main entry point is `aicommit.js` in the root directory, which imports and executes the CLI module. All other functionality is organized in the `src/` directory for better code organization. 