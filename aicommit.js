#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.aicommit.json');

const DEFAULT_CONFIG = {
  provider: 'openrouter',
  model: 'google/gemini-flash-1.5-8b',
  baseUrl: 'https://openrouter.ai/api/v1',
  temperature: 0.3,
  maxTokens: 300,
  commitStyle: 'conventional',
  autoStage: true,
  confirmBeforeCommit: true,
  customPrompt: '',
  includeContext: true,
  maxDiffLines: 500,
  language: 'en'
};

const PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyEnv: 'OPENROUTER_API_KEY',
    endpoint: 'chat/completions',
    models: [
      'google/gemini-flash-1.5-8b',
      'anthropic/claude-3-haiku',
      'openai/gpt-4o-mini',
      'meta-llama/llama-3.2-3b-instruct'
    ]
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    keyEnv: 'OPENAI_API_KEY',
    endpoint: 'chat/completions',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    keyEnv: 'ANTHROPIC_API_KEY',
    endpoint: 'messages',
    models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229']
  }
};

const CONVENTIONAL_TYPES = {
  feat: 'Introduce a new feature to the codebase',
  fix: 'Fix a bug in the codebase',
  docs: 'Create/update documentation',
  style: 'Feature and updates related to styling',
  refactor: 'Refactor a specific section of the codebase',
  test: 'Add or update code related to testing',
  chore: 'Regular code maintenance',
  perf: 'Performance improvements',
  ci: 'Continuous integration related',
  revert: 'Reverts a previous commit'
};

const COMMIT_STYLES = {
  conventional: {
    name: 'Conventional Commits',
    description: 'Standard format with type, scope, and description following Conventional Commits spec',
    template: '<type>(<scope>): <subject>\n\n<body>\n\n<footer>',
    example: 'feat(auth): add OAuth2 login support\n\nImplement Google OAuth2 authentication for user login.\nThis allows users to sign in using their Google accounts\ninstead of creating separate credentials.\n\nCloses #123'
  },
  simple: {
    name: 'Simple',
    description: 'Clean format with just subject and body, following 50/72 rule',
    template: '<subject>\n\n<body>',
    example: 'Add user authentication system\n\nImplement OAuth2 authentication with Google provider.\nUsers can now sign in using their Google accounts.'
  },
  detailed: {
    name: 'Detailed',
    description: 'Comprehensive format with type, scope, body, and footer for complex changes',
    template: '<type>(<scope>): <subject>\n\n<body>\n\n<footer>',
    example: 'feat(auth): add OAuth2 login system\n\nImplement comprehensive authentication system:\n- Google OAuth2 integration\n- User session management\n- Secure token handling\n\nThis replaces the old password-based system and provides\nbetter security and user experience.\n\nBREAKING CHANGE: removes legacy auth endpoints\nCloses #123, #124'
  }
};

const COMMIT_RULES = {
  subject: {
    maxLength: 50,
    rules: [
      'Use imperative mood (Add, Fix, Update, not Added, Fixed, Updated)',
      'Start with a verb in present tense',
      'No period at the end',
      'Capitalize the first letter',
      'Be specific and descriptive',
      'Focus on WHAT and WHY, not just HOW'
    ]
  },
  body: {
    maxLineLength: 72,
    rules: [
      'Explain the motivation for the change',
      'Contrast with previous behavior',
      'Use present tense',
      'Wrap lines at 72 characters',
      'Separate paragraphs with blank lines',
      'Include context that reviewers need'
    ]
  },
  footer: {
    rules: [
      'Reference issues and breaking changes',
      'Use "Closes #123" for issue references',
      'Use "BREAKING CHANGE:" for breaking changes',
      'Include co-authors if applicable'
    ]
  }
};

class AICommit {
  constructor() {
    this.config = this.loadConfig();
    this.spinner = null;
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        return { ...DEFAULT_CONFIG, ...config };
      }
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not load config file, using defaults'));
    }
    return { ...DEFAULT_CONFIG };
  }

  saveConfig() {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
      console.log(chalk.green('Configuration saved'));
    } catch (error) {
      console.error(chalk.red('Failed to save configuration:'), error.message);
    }
  }

  async getApiKey() {
    const provider = PROVIDERS[this.config.provider];
    let apiKey = process.env[provider.keyEnv];
    
    if (!apiKey) {
      const answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: `Enter your ${provider.name} API key:`,
          mask: '*'
        }
      ]);
      apiKey = answers.apiKey;
    }
    
    return apiKey;
  }

  async getGitChanges() {
    try {
      // Check if we're in a git repository
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
      
      // Auto stage if enabled
      if (this.config.autoStage) {
        this.spinner = ora('Staging changes...').start();
        execSync('git add .', { stdio: 'ignore' });
        this.spinner.succeed(' Changes staged');
      }

      // Get staged changes
      const changes = execSync('git diff --cached --name-status', { encoding: 'utf8' }).trim();
      let diff = execSync('git diff --cached', { encoding: 'utf8' }).trim();

      if (!changes) {
        throw new Error('No staged changes found. Please stage your changes first.');
      }

      // Limit diff size for better AI processing
      if (this.config.maxDiffLines && diff.split('\n').length > this.config.maxDiffLines) {
        const diffLines = diff.split('\n');
        diff = diffLines.slice(0, this.config.maxDiffLines).join('\n') + 
               `\n... (truncated, showing first ${this.config.maxDiffLines} lines)`;
      }

      // Get additional context if enabled
      let context = '';
      if (this.config.includeContext) {
        try {
          // Get current branch
          const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
          
          // Get recent commits for context (last 3)
          const recentCommits = execSync('git log --oneline -3', { encoding: 'utf8' }).trim();
          
          context = `Current branch: ${branch}\nRecent commits:\n${recentCommits}`;
        } catch (error) {
          // Context is optional, continue without it
        }
      }

      return { changes, diff, context };
    } catch (error) {
      if (this.spinner) this.spinner.fail();
      throw error;
    }
  }

  formatChanges(changes) {
    return changes.split('\n').map(line => {
      const [status, ...fileParts] = line.split('\t');
      const file = fileParts.join('\t');
      
      switch (status) {
        case 'A':
          return `  ${chalk.green('+')} ${chalk.white(file)} ${chalk.gray('(added)')}`;
        case 'M':
          return `  ${chalk.yellow('~')} ${chalk.white(file)} ${chalk.gray('(modified)')}`;
        case 'D':
          return `  ${chalk.red('-')} ${chalk.white(file)} ${chalk.gray('(deleted)')}`;
        case 'R':
          return `  ${chalk.blue('→')} ${chalk.white(file)} ${chalk.gray('(renamed)')}`;
        case 'C':
          return `  ${chalk.magenta('C')} ${chalk.white(file)} ${chalk.gray('(copied)')}`;
        default:
          return `  ${chalk.white(status)} ${chalk.white(file)}`;
      }
    }).join('\n');
  }

  getCommitPrompt(changes, diff, context) {
    const styleConfig = COMMIT_STYLES[this.config.commitStyle];
    
    let systemPrompt = `You are an expert Git commit message generator. Your task is to create clear, professional, and meaningful commit messages that follow industry best practices.

## COMMIT MESSAGE RULES:

### Subject Line (First Line):
- MUST be ${COMMIT_RULES.subject.maxLength} characters or less
- Use IMPERATIVE MOOD (Add, Fix, Update, Remove - NOT Added, Fixed, Updated, Removed)
- Start with a capital letter
- NO period at the end
- Be specific and descriptive
- Focus on WHAT changed and WHY, not just HOW

### Body (Optional but recommended):
- Wrap lines at ${COMMIT_RULES.body.maxLineLength} characters
- Explain the motivation and context for the change
- Use present tense
- Separate from subject with a blank line
- Can have multiple paragraphs separated by blank lines

### Footer (Optional):
- Reference issues: "Closes #123", "Fixes #456", "Refs #789"
- Breaking changes: "BREAKING CHANGE: description"
- Co-authors: "Co-authored-by: Name <email>"`;

    if (this.config.commitStyle === 'conventional') {
      systemPrompt += `

### CONVENTIONAL COMMITS FORMAT:
Follow the Conventional Commits specification: <type>(<scope>): <subject>

**Required Types:**
${Object.entries(CONVENTIONAL_TYPES).map(([type, desc]) => `- ${type}: ${desc}`).join('\n')}

**Scope (optional):** Component/module affected (auth, api, ui, db, etc.)

**Breaking Changes:** 
- Add "!" after type: feat!: or feat(scope)!:
- Or use footer: "BREAKING CHANGE: <description>"

**Examples:**
- feat(auth): add OAuth2 login support
- fix(api): resolve user data validation error
- docs: update installation instructions
- refactor!: restructure user authentication system
- chore!: update Python version to use newer libs

**Breaking Change Example:**
chore!: update Python version to use newer libs

More recent versions of important project libs no longer support Python
3.6. This has prevented us from using new features offered by such libs.
Add support for Python 3.12.

BREAKING CHANGE: drop support for Python 3.6`;
    }

    let userPrompt = `Analyze these Git changes and create a professional commit message:

## FILE CHANGES:
${changes}

## CODE DIFF:
${diff}`;

    if (context) {
      userPrompt += `\n\n## REPOSITORY CONTEXT:
${context}`;
    }

    userPrompt += `

## FORMATTING REQUIREMENTS:
Follow this template: ${styleConfig.template}

## ANALYSIS GUIDELINES:
1. Identify the PRIMARY purpose of these changes
2. Determine the appropriate commit type (if using conventional commits)
3. Identify the scope/component affected
4. Focus on business value and user impact
5. Consider if this introduces breaking changes
6. Look for patterns that suggest the motivation

## OUTPUT REQUIREMENTS:
- Return ONLY the commit message
- No explanations or additional text
- Follow all formatting and length rules
- Make it meaningful for future developers
- Consider the "why" not just the "what"`;

    // Add custom prompt if provided
    if (this.config.customPrompt.trim()) {
      userPrompt += `\n\n## ADDITIONAL REQUIREMENTS:
${this.config.customPrompt}`;
    }

    return {
      system: systemPrompt,
      user: userPrompt
    };
  }

  async generateCommitMessage(changes, diff, context) {
    const provider = PROVIDERS[this.config.provider];
    const apiKey = await this.getApiKey();
    const prompts = this.getCommitPrompt(changes, diff, context);

    this.spinner = ora('Analyzing changes and generating commit message...').start();

    try {
      let requestBody;
      let headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };

      if (this.config.provider === 'anthropic') {
        headers['anthropic-version'] = '2023-06-01';
        requestBody = {
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          messages: [
            { role: 'user', content: `${prompts.system}\n\n${prompts.user}` }
          ]
        };
      } else {
        if (this.config.provider === 'openrouter') {
          headers['HTTP-Referer'] = 'https://github.com/your-username/aicommit-js';
        }
        
        requestBody = {
          model: this.config.model,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          messages: [
            { role: 'system', content: prompts.system },
            { role: 'user', content: prompts.user }
          ]
        };
      }

      const response = await fetch(`${this.config.baseUrl}/${provider.endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API request failed: ${response.status} ${response.statusText}\n${JSON.stringify(errorData, null, 2)}`);
      }

      const data = await response.json();
      let message;

      if (this.config.provider === 'anthropic') {
        message = data.content[0].text;
      } else {
        message = data.choices[0].message.content;
      }

      this.spinner.succeed(' Commit message generated');
      return message.trim();
    } catch (error) {
      this.spinner.fail('Failed to generate commit message');
      throw error;
    }
  }

  validateCommitMessage(message) {
    const lines = message.split('\n');
    const subject = lines[0];
    const warnings = [];

    // Subject line validation
    if (subject.length > COMMIT_RULES.subject.maxLength) {
      warnings.push(`Subject line is ${subject.length} characters (should be ≤ ${COMMIT_RULES.subject.maxLength})`);
    }

    if (subject.endsWith('.')) {
      warnings.push('Subject line should not end with a period');
    }

    if (!subject.match(/^[A-Z]/)) {
      warnings.push('Subject line should start with a capital letter');
    }

    // Check for imperative mood (basic check)
    const pastTenseWords = ['added', 'fixed', 'updated', 'removed', 'changed', 'modified'];
    const subjectLower = subject.toLowerCase();
    if (pastTenseWords.some(word => subjectLower.includes(word))) {
      warnings.push('Consider using imperative mood (Add, Fix, Update instead of Added, Fixed, Updated)');
    }

    // Body line length validation
    const bodyLines = lines.slice(2); // Skip subject and blank line
    bodyLines.forEach((line, index) => {
      if (line.length > COMMIT_RULES.body.maxLineLength) {
        warnings.push(`Body line ${index + 3} is ${line.length} characters (should be ≤ ${COMMIT_RULES.body.maxLineLength})`);
      }
    });

    // Check for breaking changes indicators
    const hasBreakingChangeIndicator = subject.includes('!') || message.toLowerCase().includes('breaking change:');
    if (hasBreakingChangeIndicator) {
      warnings.push('Breaking change detected - ensure proper documentation and communication');
    }

    return warnings;
  }

  async commitChanges(message, push = false) {
    try {
      this.spinner = ora('Committing changes...').start();
      
      // Use spawn to properly handle commit messages with special characters
      const gitProcess = spawn('git', ['commit', '-m', message], {
        stdio: 'ignore'
      });
      
      await new Promise((resolve, reject) => {
        gitProcess.on('close', (code) => {
          if (code === 0) {
            this.spinner.succeed('Changes committed');
            resolve();
          } else {
            this.spinner.fail();
            reject(new Error(`Git commit failed with code ${code}`));
          }
        });
        
        gitProcess.on('error', (error) => {
          this.spinner.fail();
          reject(error);
        });
      });

      if (push) {
        this.spinner = ora('Pushing to origin...').start();
        execSync('git push origin', { stdio: 'ignore' });
        this.spinner.succeed('Changes pushed to origin');
      }
    } catch (error) {
      if (this.spinner) this.spinner.fail();
      throw error;
    }
  }

  async run(options = {}) {
    try {
      console.log(chalk.blue.bold('AI Commit Message Generator\n'));

      // Get git changes
      const { changes, diff, context } = await this.getGitChanges();
      
      // Show changes summary with colors
      console.log(chalk.cyan('Changes detected:'));
      console.log(this.formatChanges(changes));
      console.log();

      // Generate commit message
      const commitMessage = await this.generateCommitMessage(changes, diff, context);
      
      // Validate commit message
      const warnings = this.validateCommitMessage(commitMessage);
      
      // Display generated message
      console.log(chalk.green.bold('Generated commit message:'));
      console.log(chalk.white.bgGray(` ${commitMessage.split('\n').join('\n ')} `));
      console.log();

      // Show warnings if any
      if (warnings.length > 0) {
        console.log(chalk.yellow.bold('Validation warnings:'));
        warnings.forEach(warning => {
          console.log(chalk.yellow(`  • ${warning}`));
        });
        console.log();
      }

      // Ask for confirmation and push option
      if (this.config.confirmBeforeCommit && !options.yes) {
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Do you want to commit with this message?',
            default: true
          },
          {
            type: 'confirm',
            name: 'push',
            message: 'Do you want to push after committing?',
            default: false,
            when: (answers) => answers.proceed
          }
        ]);

        if (!answers.proceed) {
          console.log(chalk.yellow('Commit cancelled'));
          return;
        }

        options.push = answers.push;
      }

      // Commit changes
      await this.commitChanges(commitMessage, options.push);
      
      console.log(chalk.green.bold('\nSuccess!'));
      if (options.push) {
        console.log(chalk.green('Changes committed and pushed to origin'));
      } else {
        console.log(chalk.green('Changes committed successfully'));
      }

    } catch (error) {
      console.error(chalk.red.bold('\nError:'), error.message);
      process.exit(1);
    }
  }

  async configure() {
    console.log(chalk.blue.bold('Configuration Setup\n'));

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Select AI provider:',
        choices: Object.entries(PROVIDERS).map(([key, value]) => ({
          name: value.name,
          value: key
        })),
        default: this.config.provider
      },
      {
        type: 'list',
        name: 'modelChoice',
        message: 'Select model:',
        choices: (answers) => [
          ...PROVIDERS[answers.provider].models.map(model => ({
            name: model,
            value: model
          })),
          {
            name: 'Custom model (type manually)',
            value: 'custom'
          }
        ],
        default: this.config.model
      },
      {
        type: 'input',
        name: 'model',
        message: 'Enter custom model name:',
        when: (answers) => answers.modelChoice === 'custom',
        validate: (input) => input.trim().length > 0 || 'Model name is required'
      },
      {
        type: 'list',
        name: 'commitStyle',
        message: 'Select commit style:',
        choices: Object.entries(COMMIT_STYLES).map(([key, value]) => ({
          name: `${value.name} - ${value.description}`,
          value: key,
          short: value.name
        })),
        default: this.config.commitStyle
      },
      {
        type: 'number',
        name: 'temperature',
        message: 'Temperature (0.0-1.0, lower = more consistent):',
        default: this.config.temperature,
        validate: (value) => (value >= 0 && value <= 1) || 'Temperature must be between 0.0 and 1.0'
      },
      {
        type: 'number',
        name: 'maxTokens',
        message: 'Max tokens for response:',
        default: this.config.maxTokens,
        validate: (value) => (value > 0 && value <= 4000) || 'Max tokens must be between 1 and 4000'
      },
      {
        type: 'number',
        name: 'maxDiffLines',
        message: 'Max diff lines to analyze (prevents token overflow):',
        default: this.config.maxDiffLines,
        validate: (value) => (value > 0 && value <= 2000) || 'Max diff lines must be between 1 and 2000'
      },
      {
        type: 'confirm',
        name: 'includeContext',
        message: 'Include repository context (branch, recent commits)?',
        default: this.config.includeContext
      },
      {
        type: 'input',
        name: 'customPrompt',
        message: 'Custom prompt requirements (optional):',
        default: this.config.customPrompt
      },
      {
        type: 'confirm',
        name: 'autoStage',
        message: 'Auto-stage all changes?',
        default: this.config.autoStage
      },
      {
        type: 'confirm',
        name: 'confirmBeforeCommit',
        message: 'Confirm before committing?',
        default: this.config.confirmBeforeCommit
      }
    ]);

    // Handle model selection
    if (answers.modelChoice && answers.modelChoice !== 'custom') {
      answers.model = answers.modelChoice;
    }
    delete answers.modelChoice;

    this.config = { ...this.config, ...answers };
    this.saveConfig();
  }

  showConfig() {
    console.log(chalk.blue.bold('Current Configuration\n'));
    
    const configDisplay = {
      'Provider': PROVIDERS[this.config.provider].name,
      'Model': this.config.model,
      'Commit Style': COMMIT_STYLES[this.config.commitStyle].name,
      'Temperature': this.config.temperature,
      'Max Tokens': this.config.maxTokens,
      'Max Diff Lines': this.config.maxDiffLines,
      'Include Context': this.config.includeContext ? 'Yes' : 'No',
      'Custom Prompt': this.config.customPrompt || '(none)',
      'Auto Stage': this.config.autoStage ? 'Yes' : 'No',
      'Confirm Before Commit': this.config.confirmBeforeCommit ? 'Yes' : 'No'
    };

    Object.entries(configDisplay).forEach(([key, value]) => {
      console.log(`${chalk.cyan(key.padEnd(20))}: ${chalk.white(value)}`);
    });

    // Show commit style example
    const style = COMMIT_STYLES[this.config.commitStyle];
    console.log(`\n${chalk.cyan('Example commit message:')}`);
    console.log(chalk.gray(style.example));

    // Show commit rules
    console.log(`\n${chalk.cyan('Commit Message Rules:')}`);
    console.log(chalk.gray('Subject: ≤50 chars, imperative mood, capitalized, no period'));
    console.log(chalk.gray('Body: ≤72 chars per line, explain why and context'));
    console.log(chalk.gray('Footer: Reference issues, breaking changes'));
  }

  showRules() {
    console.log(chalk.blue.bold('Commit Message Best Practices\n'));

    console.log(chalk.cyan.bold('Subject Line Rules:'));
    COMMIT_RULES.subject.rules.forEach(rule => {
      console.log(`  ${chalk.green('•')} ${rule}`);
    });

    console.log(chalk.cyan.bold('\nBody Rules:'));
    COMMIT_RULES.body.rules.forEach(rule => {
      console.log(`  ${chalk.green('•')} ${rule}`);
    });

    console.log(chalk.cyan.bold('\nFooter Rules:'));
    COMMIT_RULES.footer.rules.forEach(rule => {
      console.log(`  ${chalk.green('•')} ${rule}`);
    });

    if (this.config.commitStyle === 'conventional') {
      console.log(chalk.cyan.bold('\nConventional Commit Types:'));
      Object.entries(CONVENTIONAL_TYPES).forEach(([type, desc]) => {
        console.log(`  ${chalk.yellow(type.padEnd(12))}: ${desc}`);
      });
      
      console.log(chalk.cyan.bold('\nBreaking Changes:'));
      console.log('  • Use "!" after type: feat!: or feat(scope)!:');
      console.log('  • Or use footer: "BREAKING CHANGE: <description>"');
      console.log(chalk.gray('\n  Example:'));
      console.log(chalk.gray('  chore!: update Python version to use newer libs\n'));
      console.log(chalk.gray('  More recent versions of important project libs no longer'));
      console.log(chalk.gray('  support Python 3.6. This has prevented us from using new'));
      console.log(chalk.gray('  features offered by such libs. Add support for Python 3.12.\n'));
      console.log(chalk.gray('  BREAKING CHANGE: drop support for Python 3.6'));
    }

    console.log(chalk.cyan.bold('\nThe 50/72 Rule:'));
    console.log('  • Subject line: ≤50 characters');
    console.log('  • Body lines: ≤72 characters');
    console.log('  • Blank line between subject and body');
  }
}

// CLI Setup
const program = new Command();
const aicommit = new AICommit();

program
  .name('aicommit')
  .description('AI-powered git commit message generator with best practices')
  .version('2.1.0');

program
  .command('commit', { isDefault: true })
  .description('Generate and commit with AI-generated message')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (options) => {
    await aicommit.run(options);
  });

program
  .command('config')
  .description('Configure aicommit settings')
  .action(async () => {
    await aicommit.configure();
  });

program
  .command('show-config')
  .description('Show current configuration')
  .action(() => {
    aicommit.showConfig();
  });

program
  .command('rules')
  .description('Show commit message best practices and rules')
  .action(() => {
    aicommit.showRules();
  });

program
  .command('reset-config')
  .description('Reset configuration to defaults')
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to reset configuration to defaults?',
        default: false
      }
    ]);

    if (answers.confirm) {
      aicommit.config = { ...DEFAULT_CONFIG };
      aicommit.saveConfig();
      console.log(chalk.green('Configuration reset to defaults'));
    }
  });

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(chalk.red.bold('\nUnhandled error:'), error.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\nGoodbye!'));
  process.exit(0);
});

program.parse();