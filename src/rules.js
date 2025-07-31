import chalk from 'chalk';
import { COMMIT_RULES, CONVENTIONAL_TYPES } from './constants.js';

export class RulesManager {
  constructor(config) {
    this.config = config;
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
      console.log(chalk.cyan.bold('\nConventional Commit Types (lowercase):'));
      Object.entries(CONVENTIONAL_TYPES).forEach(([type, desc]) => {
        console.log(`  ${chalk.yellow(type.padEnd(12))}: ${desc}`);
      });
      
      console.log(chalk.cyan.bold('\nLowercase Format Examples:'));
      console.log('  • feat(auth): add OAuth2 login support');
      console.log('  • fix(api): resolve user validation error');
      console.log('  • docs: update installation guide');
      console.log('  • chore: update dependencies');
      
      console.log(chalk.cyan.bold('\nBody Format with Bullet Points:'));
      console.log('  feat(auth): add OAuth2 login support');
      console.log('  ');
      console.log('  - implement Google OAuth2 integration');
      console.log('  - add user session management');
      console.log('  - create secure token handling');
      console.log('  ');
      console.log('  This allows users to sign in using their Google accounts');
      console.log('  instead of creating separate credentials.');
      
      console.log(chalk.cyan.bold('\nBreaking Changes:'));
      console.log('  • Use "!" after type: feat!: or feat(scope)!:');
      console.log('  • Or use footer: "BREAKING CHANGE: <description>"');
      console.log(chalk.gray('\n  Example:'));
      console.log(chalk.gray('  chore!: update Python version to use newer libs\n'));
      console.log(chalk.gray('  - drop support for Python 3.6'));
      console.log(chalk.gray('  - add support for Python 3.12'));
      console.log(chalk.gray('  - update project dependencies\n'));
      console.log(chalk.gray('  More recent versions of important project libs no longer'));
      console.log(chalk.gray('  support Python 3.6. This has prevented us from using new'));
      console.log(chalk.gray('  features offered by such libs.\n'));
      console.log(chalk.gray('  BREAKING CHANGE: drop support for Python 3.6'));
    }

    console.log(chalk.cyan.bold('\nThe 50/72 Rule:'));
    console.log('  • Subject line: ≤50 characters');
    console.log('  • Body lines: ≤72 characters');
    console.log('  • Blank line between subject and body');
  }
} 