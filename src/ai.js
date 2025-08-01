import inquirer from "inquirer";
import ora from "ora";
import {
	PROVIDERS,
	COMMIT_STYLES,
	COMMIT_RULES,
	CONVENTIONAL_TYPES,
} from "./constants.js";

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
					type: "password",
					name: "apiKey",
					message: `Enter your ${provider.name} API key:`,
					mask: "*",
				},
			]);
			apiKey = answers.apiKey;
		}

		return apiKey;
	}

	getCommitPrompt(changes, diff, context, userFeedback = "") {
		const styleConfig = COMMIT_STYLES[this.config.commitStyle];

		let systemPrompt = `You are an expert Git commit message generator with deep understanding of software development practices. Your task is to create clear, professional, and meaningful commit messages that accurately reflect the changes made.

## CRITICAL FORMATTING RULES:

### OUTPUT FORMAT:
- Return ONLY the commit message text
- DO NOT wrap in markdown code blocks (no \`\`\`)  
- DO NOT include any explanations or additional text
- DO NOT add any formatting characters or symbols

### Subject Line (First Line):
- MUST be ${COMMIT_RULES.subject.maxLength} characters or less
- Use the IMPERATIVE MOOD for the subject line (e.g., add, fix, update, remove, improve, enhance; NOT added, fixed, updated, removed)
- Start with LOWERCASE letter (except proper nouns like "API", "OAuth")
- NO period at the end
- Be specific and descriptive about the actual change
- Focus on WHAT changed and WHY it matters, not just HOW it was done
- Prioritize clarity and precision over brevity

### Body (Optional but recommended):
- Wrap lines at ${COMMIT_RULES.body.maxLineLength} characters
- Explain the motivation, context, and impact of the change
- Use present tense and active voice
- Separate from subject with a blank line
- Can have multiple paragraphs separated by blank lines
- Use bullet points with "- " for lists when appropriate and first character MUST be uppercase
- Format multiple changes or features as bullet points
- Include technical details that would help future developers understand the change

### Footer (Optional):
- Breaking changes: "BREAKING CHANGE: description"
- Reference issues: "Fixes #123", "Closes #456", "Relates to #789"`;

		if (this.config.commitStyle === "conventional") {
			systemPrompt += `

### CONVENTIONAL COMMITS FORMAT:
Follow the Conventional Commits specification: <type>(<scope>): <subject>

**Required Types (ALL LOWERCASE):**
${Object.entries(CONVENTIONAL_TYPES)
	.map(([type, desc]) => `- ${type}: ${desc}`)
	.join("\n")}

**Scope (optional):** Component/module affected (auth, api, ui, db, etc.)

**Breaking Changes:** 
- Add "!" after type: feat!: or feat(scope)!:
- Or use footer: "BREAKING CHANGE: <description>"

**COMMIT TYPE SELECTION GUIDELINES (CRITICAL - READ CAREFULLY):**

**STRICT TYPE DEFINITIONS:**
- **style**: Code formatting, whitespace, semicolons, linting fixes (NO functional changes)
- **fix**: Bug fixes, error corrections, resolving broken functionality
- **feat**: ONLY truly NEW features/functionality that didn't exist before
- **refactor**: Code restructuring without changing external behavior
- **docs**: Documentation changes (README, comments, guides, examples)
- **test**: Adding or modifying tests
- **chore**: Dependencies, build scripts, configuration files
- **perf**: Performance improvements with measurable impact
- **ci**: CI/CD pipeline, GitHub Actions, build processes
- **revert**: Reverting previous commits

**DECISION TREE FOR TYPE SELECTION:**
1. **Is this ONLY formatting/linting changes?** → USE "style"
2. **Is this fixing broken functionality?** → USE "fix"  
3. **Is this restructuring existing code without new features?** → USE "refactor"
4. **Is this updating documentation?** → USE "docs"
5. **Is this adding/modifying tests?** → USE "test"
6. **Is this dependencies/config/build tools?** → USE "chore"
7. **Is this genuinely NEW functionality never existed before?** → USE "feat"

**CRITICAL ANTI-PATTERNS TO AVOID:**
- Do NOT use "feat" for code formatting (use "style")
- Do NOT use "feat" for bug fixes (use "fix")
- Do NOT use "feat" for refactoring (use "refactor")
- Do NOT use "feat" for documentation (use "docs")
- Do NOT use "feat" as a default - be specific
- Do NOT use "feat" for improvements to existing features (use "refactor" or appropriate type)

**Examples (note lowercase format with proper spacing):**
- feat(auth): add OAuth2 login support
- fix(api): resolve user data validation error  
- docs: update installation instructions
- refactor!: restructure user authentication system
- chore: update dependencies to latest versions
- style: format code according to linting rules
- test(auth): add unit tests for login functionality
- perf(api): optimize database queries

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
- Keep bullet points concise and actionable
- Choose the MOST SPECIFIC and APPROPRIATE commit type`;
		}

		let userPrompt = `Analyze these Git changes and create a professional commit message:

## FILE CHANGES:
${changes}

## CODE DIFF:
${diff}

## COMPREHENSIVE CHANGE ANALYSIS:
Perform a thorough analysis of the changes above. Consider:

### 1. SCOPE AND IMPACT:
- What files were added, modified, or deleted?
- What specific functionality was changed or added?
- What is the primary purpose and motivation for these changes?
- How significant is the impact of these changes?
- Are there any breaking changes or backward compatibility issues?

### 2. TECHNICAL DETAILS:
- What algorithms, functions, or methods were modified?
- Were there any performance improvements or optimizations?
- Are there new dependencies or configuration changes?
- What testing or validation changes were made?

### 3. BUSINESS CONTEXT:
- What problem does this solve for users or developers?
- What value does this change provide?
- Is this addressing a bug, adding a feature, or improving existing functionality?
- Does this relate to any specific requirements or issues?
`;

		if (context) {
			userPrompt += `\n\n## REPOSITORY CONTEXT:
${context}`;
		}

		userPrompt += `

## FORMATTING REQUIREMENTS:
Follow this template: ${styleConfig.template}

## COMMIT TYPE ANALYSIS - STEP BY STEP:

**STEP 1: ANALYZE THE CHANGE NATURE**
Look exactly at what was changed:
- Are files only reformatted/styled? → "style"
- Is broken code being fixed? → "fix" 
- Is completely new functionality added? → "feat"
- Is code restructured without new features? → "refactor"
- Are docs/comments updated? → "docs"
- Are tests added/modified? → "test"
- Are deps/config/build files changed? → "chore"

**STEP 2: APPLY DECISION RULES**
- **FORMATTING ONLY** (prettier, eslint, whitespace) = "style"
- **BUG FIXES** (fixing errors, resolving issues) = "fix"
- **NEW FEATURES** (adding functionality that never existed) = "feat"
- **CODE RESTRUCTURE** (improving code without new features) = "refactor"
- **DOCUMENTATION** (README, comments, guides) = "docs"
- **TESTING** (add/modify tests) = "test"
- **MAINTENANCE** (deps, config, build) = "chore"

**STEP 3: VERIFY YOUR CHOICE**
- Does the diff show ONLY formatting changes? Must be "style"
- Does the diff show fixing broken functionality? Must be "fix"
- Does the diff show entirely NEW functionality? Only then "feat"

## SCOPE IDENTIFICATION:
Identify the specific component or area affected:
- Look at file paths and changes
- Consider the primary functionality being modified
- Use descriptive scope names (auth, api, ui, cli, config, etc.)

## ANALYSIS GUIDELINES:
1. **PRIMARY PURPOSE**: What is the main goal of these changes?
2. **CHANGE TYPE**: What kind of change is this? (new feature, bug fix, improvement, etc.)
3. **SCOPE**: Which component or area is most affected?
4. **IMPACT**: What value does this provide to users or developers?
5. **BREAKING**: Does this change break existing functionality?

## DETAILED ANALYSIS STEPS:
1. **Examine file changes**: Look at which files were added, modified, or deleted
2. **Analyze code changes**: Understand what the code changes accomplish
3. **Identify patterns**: Look for common patterns (new features, bug fixes, refactoring)
4. **Consider context**: Think about the broader impact and purpose
5. **Choose specificity**: Select the most specific and accurate commit type

## EXAMPLES BY CHANGE TYPE:
- **Adding new files/functions**: feat(component): add new feature
- **Fixing bugs/errors**: fix(component): resolve specific issue
- **Improving existing code**: refactor(component): improve implementation
- **Updating documentation**: docs: update installation guide
- **Code style changes**: style: format code according to standards
- **Adding tests**: test(component): add unit tests for feature
- **Dependency updates**: chore: update dependencies to latest versions
- **Performance improvements**: perf(component): optimize algorithm

## CHANGE PATTERN ANALYSIS:
**PRECISE PATTERN MATCHING:**
- **Only whitespace/formatting/linting changes**: ALWAYS "style"
- **Fixing bugs/errors/broken functionality**: ALWAYS "fix"
- **Adding completely new features/capabilities**: ALWAYS "feat" 
- **Improving existing code structure**: ALWAYS "refactor"
- **README/comments/documentation updates**: ALWAYS "docs"
- **Adding/modifying test files**: ALWAYS "test"
- **package.json/config/build files**: ALWAYS "chore"
- **Performance improvements**: ALWAYS "perf"
- **CI/CD/GitHub Actions**: ALWAYS "ci"

**COMMON MISCLASSIFICATIONS TO AVOID:**
- Formatting changes marked as "feat" → Should be "style"
- Code improvements marked as "feat" → Should be "refactor"
- Bug fixes marked as "feat" → Should be "fix"
- Documentation marked as "feat" → Should be "docs"

## CRITICAL OUTPUT REQUIREMENTS:
- Return ONLY the commit message (no code blocks, no explanations)
- Use lowercase format as specified above
- Follow all formatting and length rules
- Make it meaningful for future developers
- Consider the "why" not just the "what"
- Do NOT wrap response in \`\`\` or any other formatting
- Uppercase for paragraphs of description

## FINAL TYPE SELECTION REMINDER:
- **FORMATTING/LINTING ONLY** → "style" (NOT "feat")
- **BUG FIXES** → "fix" (NOT "feat")  
- **CODE IMPROVEMENTS** → "refactor" (NOT "feat")
- **DOCUMENTATION** → "docs" (NOT "feat")
- **TRULY NEW FEATURES** → "feat" (ONLY if completely new functionality)

**DO NOT DEFAULT TO "feat" - BE PRECISE AND SPECIFIC!**
`;

		// Add custom prompt if provided
		if (this.config.customPrompt.trim()) {
			userPrompt += `\n\n## ADDITIONAL REQUIREMENTS:
${this.config.customPrompt}`;
		}

		// Add user feedback for regeneration
		if (userFeedback && userFeedback.trim()) {
			userPrompt += `\n\n## USER FEEDBACK FOR IMPROVEMENT:
The user provided the following feedback for improving the commit message:
"${userFeedback}"

Please take this feedback into account and adjust the commit message accordingly while maintaining all formatting requirements.`;
		}

		return {
			system: systemPrompt,
			user: userPrompt,
		};
	}

	cleanCommitMessage(message) {
		// Remove markdown code blocks and any surrounding formatting
		let cleaned = message.trim();

		// Remove code block markers
		cleaned = cleaned.replace(/^```[\w]*\n?/gm, "");
		cleaned = cleaned.replace(/\n?```$/gm, "");
		cleaned = cleaned.replace(/^```$/gm, "");

		// Remove any leading/trailing whitespace
		cleaned = cleaned.trim();

		// Split into lines and clean each line
		const lines = cleaned.split("\n");
		const cleanedLines = lines
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		// Rejoin with proper spacing
		return cleanedLines.join("\n");
	}

	async generateCommitMessage(changes, diff, context, userFeedback = "") {
		const provider = PROVIDERS[this.config.provider];
		const apiKey = await this.getApiKey();
		const prompts = this.getCommitPrompt(changes, diff, context, userFeedback);

		this.spinner = ora(
			"Analyzing changes and generating commit message...",
		).start();

		try {
			let requestBody;
			let headers = {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			};

			if (this.config.provider === "anthropic") {
				headers["anthropic-version"] = "2023-06-01";
				requestBody = {
					model: this.config.model,
					max_tokens: this.config.maxTokens,
					messages: [
						{ role: "user", content: `${prompts.system}\n\n${prompts.user}` },
					],
				};
			} else {
				if (this.config.provider === "openrouter") {
					headers["HTTP-Referer"] =
						"https://github.com/your-username/aicommit-js";
				}

				requestBody = {
					model: this.config.model,
					temperature: this.config.temperature,
					max_tokens: this.config.maxTokens,
					messages: [
						{ role: "system", content: prompts.system },
						{ role: "user", content: prompts.user },
					],
				};
			}

			const response = await fetch(
				`${this.config.baseUrl}/${provider.endpoint}`,
				{
					method: "POST",
					headers,
					body: JSON.stringify(requestBody),
				},
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					`API request failed: ${response.status} ${response.statusText}\n${JSON.stringify(errorData, null, 2)}`,
				);
			}

			const data = await response.json();
			let message;

			if (this.config.provider === "anthropic") {
				message = data.content[0].text;
			} else {
				message = data.choices[0].message.content;
			}

			this.spinner.succeed(" Commit message generated");

			// Clean the message to remove any markdown formatting
			const cleanedMessage = this.cleanCommitMessage(message);
			return cleanedMessage;
		} catch (error) {
			this.spinner.fail("Failed to generate commit message");
			throw error;
		}
	}
}

