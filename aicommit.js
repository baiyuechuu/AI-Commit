#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
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
  temperature: 0.7,
  maxTokens: 200,
  commitStyle: 'conventional',
  autoStage: true,
  confirmBeforeCommit: true,
  customPrompt: ''
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

const COMMIT_STYLES = {
  conventional: {
    name: 'Conventional Commits',
    description: 'Standard format with type, scope, and description. Best for team projects.',
    template: '<type>(<scope>): <subject>\n\n<body>',
    example: 'feat(auth): add login functionality\n\nImplement OAuth2 authentication with Google provider'
  },
  simple: {
    name: 'Simple',
    description: 'Clean format with just subject and body. Good for personal projects.',
    template: '<subject>\n\n<body>',
    example: 'Add user authentication\n\nImplement login and logout functionality'
  },
  detailed: {
    name: 'Detailed',
    description: 'Comprehensive format with type, scope, body, and footer. For complex changes.',
    template: '<type>(<scope>): <subject>\n\n<body>\n\n<footer>',
    example: 'feat(auth): add OAuth2 login\n\nImplement Google OAuth2 authentication\n\nCloses #123, Breaking change: removes old auth'
  }
};

const LANGUAGES = {
  en: 'English'
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
        this.spinner.succeed('Changes staged');
      }

      // Get staged changes
      const changes = execSync('git diff --cached --name-status', { encoding: 'utf8' }).trim();
      const diff = execSync('git diff --cached', { encoding: 'utf8' }).trim();

      if (!changes) {
        throw new Error('No staged changes found. Please stage your changes first.');
      }

      return { changes, diff };
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

  getCommitPrompt(changes, diff) {
    const styleConfig = COMMIT_STYLES[this.config.commitStyle];
    let systemPrompt = "You are a git commit message generator. Create clear, concise commit messages following best practices.";
    let userPrompt = `Generate a commit message for these changes:\n\n## File changes:\n${changes}\n\n## Diff:\n${diff}\n\n## Format:\n${styleConfig.template}\n\nImportant:\n- Use imperative mood\n- Keep subject under 70 characters\n- Be specific about what changed\n- Only return the commit message, no explanations`;

    // Add custom prompt if provided
    if (this.config.customPrompt.trim()) {
      userPrompt += `\n\n## Additional Requirements:\n${this.config.customPrompt}`;
    }

    return {
      system: systemPrompt,
      user: userPrompt
    };
  }

  async generateCommitMessage(changes, diff) {
    const provider = PROVIDERS[this.config.provider];
    const apiKey = await this.getApiKey();
    const prompts = this.getCommitPrompt(changes, diff);

    this.spinner = ora('Generating commit message...').start();

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
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      let message;

      if (this.config.provider === 'anthropic') {
        message = data.content[0].text;
      } else {
        message = data.choices[0].message.content;
      }

      this.spinner.succeed('Commit message generated');
      return message.trim();
    } catch (error) {
      this.spinner.fail('Failed to generate commit message');
      throw error;
    }
  }

  async commitChanges(message, push = false) {
    try {
      this.spinner = ora('Committing changes...').start();
      execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { stdio: 'ignore' });
      this.spinner.succeed('Changes committed');

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
      const { changes, diff } = await this.getGitChanges();
      
      // Show changes summary with colors
      console.log(chalk.cyan('Changes detected:'));
      console.log(this.formatChanges(changes));
      console.log();

      // Generate commit message
      const commitMessage = await this.generateCommitMessage(changes, diff);
      
      // Display generated message
      console.log(chalk.green.bold('Generated commit message:'));
      console.log(chalk.white.bgGray(` ${commitMessage} `));
      console.log();

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
        message: 'Temperature (0.0-1.0, higher = more creative):',
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
  }
}

// CLI Setup
const program = new Command();
const aicommit = new AICommit();

program
  .name('aicommit')
  .description('AI-powered git commit message generator')
  .version('2.0.0');

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