import inquirer from 'inquirer';
import ora from 'ora';
import { PROVIDERS, COMMIT_STYLES, COMMIT_RULES, CONVENTIONAL_TYPES } from './constants.js';

export class AIService {
  constructor(config) {
    this.config = config;
    this.spinner = null;
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

  getCommitPrompt(changes, diff, context) {
    const styleConfig = COMMIT_STYLES[this.config.commitStyle];
    
    let systemPrompt = `You are an expert Git commit message generator. Your task is to create clear, professional, and meaningful commit messages that follow industry best practices.

## CRITICAL FORMATTING RULES:

### OUTPUT FORMAT:
- Return ONLY the commit message text
- DO NOT wrap in markdown code blocks (no \`\`\`)  
- DO NOT include any explanations or additional text
- DO NOT add any formatting characters or symbols

### Subject Line (First Line):
- MUST be ${COMMIT_RULES.subject.maxLength} characters or less
- Use IMPERATIVE MOOD (add, fix, update, remove, improve, enhance, etc. - NOT added, fixed, updated, removed)
- Start with LOWERCASE letter (except proper nouns like "API", "OAuth")
- NO period at the end
- Be specific and descriptive
- Focus on WHAT changed and WHY, not just HOW

### Body (Optional but recommended):
- Wrap lines at ${COMMIT_RULES.body.maxLineLength} characters
- Explain the motivation and context for the change
- Use present tense
- Separate from subject with a blank line
- Can have multiple paragraphs separated by blank lines
- Use bullet points with "- " for lists when appropriate and first character MUST be uppercase
- Format multiple changes or features as bullet points

### Footer (Optional):
- Breaking changes: "BREAKING CHANGE: description"
- Co-authors: "Co-authored-by: Baiyuechu Assistant <contact@baiyuechu.dev>"`;

    if (this.config.commitStyle === 'conventional') {
      systemPrompt += `

### CONVENTIONAL COMMITS FORMAT:
Follow the Conventional Commits specification: <type>(<scope>): <subject>

**Required Types (ALL LOWERCASE):**
${Object.entries(CONVENTIONAL_TYPES).map(([type, desc]) => `- ${type}: ${desc}`).join('\n')}

**Scope (optional):** Component/module affected (auth, api, ui, db, etc.)

**Breaking Changes:** 
- Add "!" after type: feat!: or feat(scope)!:
- Or use footer: "BREAKING CHANGE: <description>"

**Examples (note lowercase format with proper spacing):**
- feat(auth): add OAuth2 login support
- fix(api): resolve user data validation error  
- docs: update installation instructions
- refactor!: restructure user authentication system
- chore: update dependencies to latest versions

**Body Formatting Examples:**
feat(auth): add OAuth2 login support

- implement Google OAuth2 integration
- add user session management
- create secure token handling
- update login UI components

This replaces the old password-based system and provides
better security and user experience.

**IMPORTANT FORMATTING:** 
- Type and scope should be lowercase
- Subject description starts with lowercase verb
- Only proper nouns (API, OAuth, etc.) should be capitalized
- Always include space after colon in "type(scope): description"
- Use "- " (dash + space) for bullet points in body
- Keep bullet points concise and actionable`;
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

## CRITICAL OUTPUT REQUIREMENTS:
- Return ONLY the commit message (no code blocks, no explanations)
- Use lowercase format as specified above
- Follow all formatting and length rules
- Make it meaningful for future developers
- Consider the "why" not just the "what"
- Do NOT wrap response in \`\`\` or any other formatting
- Uppercase for paragraphs of description
`;

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

  cleanCommitMessage(message) {
    // Remove markdown code blocks and any surrounding formatting
    let cleaned = message.trim();
    
    // Remove code block markers
    cleaned = cleaned.replace(/^```[\w]*\n?/gm, '');
    cleaned = cleaned.replace(/\n?```$/gm, '');
    cleaned = cleaned.replace(/^```$/gm, '');
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // Split into lines and clean each line
    const lines = cleaned.split('\n');
    const cleanedLines = lines.map(line => line.trim()).filter(line => line.length > 0);
    
    // Rejoin with proper spacing
    return cleanedLines.join('\n');
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
      
      // Clean the message to remove any markdown formatting
      const cleanedMessage = this.cleanCommitMessage(message);
      return cleanedMessage;
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

    // Updated validation for lowercase format
    if (this.config.commitStyle === 'conventional') {
      // Check conventional commit format with proper spacing
      const conventionalMatch = subject.match(/^([a-z]+)(\([^)]+\))?: (.+)$/);
      if (conventionalMatch) {
        const [, type, scope, description] = conventionalMatch;
        
        // Check if there's proper spacing after colon
        if (!subject.includes(': ')) {
          warnings.push('Missing space after colon in conventional commit format');
        }
        
        // Check if description starts with lowercase (except proper nouns)
        if (!/^[a-z]/.test(description) && !/^[A-Z][A-Z]/.test(description)) {
          warnings.push('Commit description should start with lowercase letter (except proper nouns)');
        }
      } else {
        warnings.push('Invalid conventional commit format. Expected: type(scope): description');
      }
    } else {
      // For non-conventional commits, check if it starts with uppercase
      if (!subject.match(/^[A-Z]/)) {
        warnings.push('Subject line should start with a capital letter (for non-conventional commits)');
      }
    }

    // Check for imperative mood (basic check)
    const pastTenseWords = ['added', 'fixed', 'updated', 'removed', 'changed', 'modified'];
    const subjectLower = subject.toLowerCase();
    if (pastTenseWords.some(word => subjectLower.includes(word))) {
      warnings.push('Consider using imperative mood (add, fix, update instead of added, fixed, updated)');
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
} 