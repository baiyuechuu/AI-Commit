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
  confirmBeforeCommit: true
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
    template: '<type>(<scope>): <subject>\n\n<body>'
  },
  simple: {
    name: 'Simple',
    template: '<subject>\n\n<body>'
  },
  detailed: {
    name: 'Detailed',
    template: '<type>(<scope>): <subject>\n\n<body>\n\n<footer>'
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
      console.log(chalk.green('✓ Configuration saved'));
    } catch (error) {
      console.error(chalk.red('✗ Failed to save configuration:'), error.message);
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

  getCommitPrompt(changes, diff) {
    const styleConfig = COMMIT_STYLES[this.config.commitStyle];
    const prompts = {
      system: "You are a git commit message generator. Create clear, concise commit messages following best practices.",
      user: `Generate a commit message for these changes:\n\n## File changes:\n${changes}\n\n## Diff:\n${diff}\n\n## Format:\n${styleConfig.template}\n\nImportant:\n- Use imperative mood\n- Keep subject under 70 characters\n- Be specific about what changed\n- Only return the commit message, no explanations`
    };

    return prompts;
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
      console.log(chalk.blue.bold('🤖 AI Commit Message Generator\n'));

      // Get git changes
      const { changes, diff } = await this.getGitChanges();
      
      // Show changes summary
      console.log(chalk.cyan('📝 Changes detected:'));
      console.log(chalk.gray(changes.split('\n').map(line => `  ${line}`).join('\n')));
      console.log();

      // Generate commit message
      const commitMessage = await this.generateCommitMessage(changes, diff);
      
      // Display generated message
      console.log(chalk.green.bold('✨ Generated commit message:'));
      console.log(chalk.white.bgGray(` ${commitMessage} `));
      console.log();

      // Confirm before committing
      if (this.config.confirmBeforeCommit && !options.yes) {
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Do you want to commit with this message?',
            default: true
          }
        ]);

        if (!answers.proceed) {
          console.log(chalk.yellow('Commit cancelled'));
          return;
        }
      }

      // Commit changes
      await this.commitChanges(commitMessage, options.push);
      
      console.log(chalk.green.bold('\n🎉 Success!'));
      if (options.push) {
        console.log(chalk.green('Changes committed and pushed to origin'));
      } else {
        console.log(chalk.green('Changes committed successfully'));
      }

    } catch (error) {
      console.error(chalk.red.bold('\n❌ Error:'), error.message);
      process.exit(1);
    }
  }

  async configure() {
    console.log(chalk.blue.bold('🔧 Configuration Setup\n'));

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
        name: 'model',
        message: 'Select model:',
        choices: (answers) => PROVIDERS[answers.provider].models,
        default: this.config.model
      },
      {
        type: 'list',
        name: 'commitStyle',
        message: 'Select commit style:',
        choices: Object.entries(COMMIT_STYLES).map(([key, value]) => ({
          name: value.name,
          value: key
        })),
        default: this.config.commitStyle
      },
      {
        type: 'number',
        name: 'temperature',
        message: 'Temperature (0.0-1.0):',
        default: this.config.temperature,
        validate: (value) => value >= 0 && value <= 1
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

    this.config = { ...this.config, ...answers };
    this.saveConfig();
  }

  showConfig() {
    console.log(chalk.blue.bold('📋 Current Configuration\n'));
    
    const configDisplay = {
      'Provider': PROVIDERS[this.config.provider].name,
      'Model': this.config.model,
      'Commit Style': COMMIT_STYLES[this.config.commitStyle].name,
      'Temperature': this.config.temperature,
      'Auto Stage': this.config.autoStage ? '✓' : '✗',
      'Confirm Before Commit': this.config.confirmBeforeCommit ? '✓' : '✗'
    };

    Object.entries(configDisplay).forEach(([key, value]) => {
      console.log(`${chalk.cyan(key.padEnd(20))}: ${chalk.white(value)}`);
    });
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
  .option('-p, --push', 'Push changes after commit')
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
      console.log(chalk.green('✓ Configuration reset to defaults'));
    }
  });

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(chalk.red.bold('\n❌ Unhandled error:'), error.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Goodbye!'));
  process.exit(0);
});

program.parse();