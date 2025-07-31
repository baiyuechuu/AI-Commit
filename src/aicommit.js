import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from './config.js';
import { GitManager } from './git.js';
import { AIService } from './ai.js';
import { RulesManager } from './rules.js';

export class AICommit {
  constructor() {
    this.configManager = new ConfigManager();
    this.config = this.configManager.getConfig();
    this.gitManager = new GitManager(this.config);
    this.aiService = new AIService(this.config);
    this.rulesManager = new RulesManager(this.config);
  }

  async run(options = {}) {
    try {
      console.log(chalk.blue.bold('AI Commit Message Generator\n'));

      // Get git changes
      const { changes, diff, context } = await this.gitManager.getGitChanges();
      
      // Show changes summary with colors
      console.log(chalk.cyan('Changes detected:'));
      console.log(this.gitManager.formatChanges(changes));
      console.log();

      // Generate commit message
      const commitMessage = await this.aiService.generateCommitMessage(changes, diff, context);
      
      // Validate commit message
      const warnings = this.aiService.validateCommitMessage(commitMessage);
      
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
      await this.gitManager.commitChanges(commitMessage, options.push);
      
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
    await this.configManager.configure();
    // Update local config reference
    this.config = this.configManager.getConfig();
    // Update other managers with new config
    this.gitManager = new GitManager(this.config);
    this.aiService = new AIService(this.config);
    this.rulesManager = new RulesManager(this.config);
  }

  showConfig() {
    this.configManager.showConfig();
  }

  showRules() {
    this.rulesManager.showRules();
  }

  async resetConfig() {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to reset configuration to defaults?',
        default: false
      }
    ]);

    if (answers.confirm) {
      this.configManager.resetConfig();
      // Update local config reference
      this.config = this.configManager.getConfig();
      // Update other managers with new config
      this.gitManager = new GitManager(this.config);
      this.aiService = new AIService(this.config);
      this.rulesManager = new RulesManager(this.config);
      console.log(chalk.green('Configuration reset to defaults'));
    }
  }
} 