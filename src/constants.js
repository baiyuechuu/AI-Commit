import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
export const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.aicommit.json');

export const DEFAULT_CONFIG = {
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

export const PROVIDERS = {
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

export const CONVENTIONAL_TYPES = {
  feat: 'introduce a new feature to the codebase',
  fix: 'fix a bug in the codebase',
  docs: 'create/update documentation',
  style: 'feature and updates related to styling',
  refactor: 'refactor a specific section of the codebase',
  test: 'add or update code related to testing',
  chore: 'regular code maintenance',
  perf: 'performance improvements',
  ci: 'continuous integration related',
  revert: 'reverts a previous commit'
};

export const COMMIT_STYLES = {
  conventional: {
    name: 'Conventional Commits',
    description: 'Standard format with type, scope, and description following Conventional Commits spec',
    template: '<type>(<scope>): <subject>\n\n<body>\n\n<footer>',
    example: 'feat(auth): add OAuth2 login support\n\n- implement Google OAuth2 integration\n- add user session management\n- create secure token handling\n\nThis allows users to sign in using their Google accounts\ninstead of creating separate credentials.\n\nCloses #123'
  },
  simple: {
    name: 'Simple',
    description: 'Clean format with just subject and body, following 50/72 rule',
    template: '<subject>\n\n<body>',
    example: 'Add user authentication system\n\n- implement OAuth2 authentication with Google provider\n- create user session management\n- add secure token handling\n\nUsers can now sign in using their Google accounts.'
  },
  detailed: {
    name: 'Detailed',
    description: 'Comprehensive format with type, scope, body, and footer for complex changes',
    template: '<type>(<scope>): <subject>\n\n<body>\n\n<footer>',
    example: 'feat(auth): add OAuth2 login system\n\n- implement comprehensive authentication system\n- add Google OAuth2 integration\n- create user session management\n- add secure token handling\n\nThis replaces the old password-based system and provides\nbetter security and user experience.\n\nBREAKING CHANGE: removes legacy auth endpoints\nCloses #123, #124'
  }
};

export const COMMIT_RULES = {
  subject: {
    maxLength: 50,
    rules: [
      'Use imperative mood (add, fix, update, not added, fixed, updated)',
      'Start with a lowercase verb (except for proper nouns)',
      'No period at the end',
      'Be specific and descriptive',
      'Focus on WHAT and WHY, not just HOW'
    ]
  },
  body: {
    maxLineLength: 111,
    rules: [
      'Explain the motivation for the change',
      'Contrast with previous behavior',
      'Use present tense',
      'Wrap lines at 111 characters',
      'Separate paragraphs with blank lines',
      'Include context that reviewers need'
    ]
  },
  footer: {
    rules: [
      'Use "BREAKING CHANGE:" for breaking changes',
      'Include co-authors if applicable',
      'Use "Co-authored-by:" for co-authors'
    ]
  }
}; 