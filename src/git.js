import { execSync, spawn } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

export class GitManager {
  constructor(config) {
    this.config = config;
    this.spinner = null;
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
} 