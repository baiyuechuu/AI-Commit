#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { AICommit } from './aicommit.js';

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
    await aicommit.resetConfig();
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