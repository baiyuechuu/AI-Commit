import inquirer from "inquirer";
import ora from "ora";
import { PROVIDERS, GITMOJI_MAPPINGS } from "./constants.js";

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

	async getCommitPrompt(changes, diff, context, userFeedback = "", commitType = "normal") {
		// Handle commitType as string
		const actualCommitType = commitType;
		const systemPrompt = `You are a git commit message generator. Create conventional commit messages.`;

		let userPrompt = `Generate a commit message for these changes:

## File changes:
<file_changes>
${changes}
</file_changes>

## Diff:
<diff>
${diff}
</diff>

## Analysis Instructions:
1. **Examine the file changes** - understand what files were modified, added, or deleted
2. **Study the diff** - see exactly what lines were added, removed, or modified
3. **Review the detailed context** - compare before/after file contents to understand the full scope of changes
4. **Identify the type of change** - determine if it's a new feature, bug fix, refactoring, etc.
5. **Determine the scope** - identify which component or module is affected
6. **Write a precise commit message** - be specific about what changed and why

!!! MUST FOLLOW RULE: 50/72 characters

## Format:
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>

IMPORTANT:
- Type must be one of the following with their meanings:
  * build: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
  * ci: Continuous integration related, changes to our CI configuration files and scripts (example scopes: Circle, BrowserStack, SauceLabs)
  * docs: Documentation only changes, update/create documentation
  * feat: A new feature, introduce a new feature to the codebase
  * fix: A bug fix in codebase, fix a bug in the codebase
  * perf: A code change that improves performance
  * refactor: A code change that neither fixes a bug nor adds a feature, refactor a specific section of the codebase
  * style: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
  * test: Adding missing tests or correcting existing tests, add or update code related to testing
  * chore: Routine tasks, maintenance, or tooling changes
${this.config.useGitmoji ? `
- Gitmoji: Use emoji prefix for commit types. All types:
  * feat: ✨ (new features)
  * fix: 🐛 (bug fixes)
  * docs: 📚 (documentation)
  * style: 💄 (cosmetic/UI changes)
  * refactor: 🔨 (code refactoring)
  * perf: 🐎 (performance improvements)
  * test: 🚨 (tests)
  * chore: 🔧 (configuration files)
  * build: 📦 (package/build files)
  * ci: 👷 (CI/CD)
  * hotfix: 🚑 (critical fixes)
  * security: 🔒 (security fixes)
  * breaking: 💥 (breaking changes)
  * deps_add: ➕ (add dependencies)
  * deps_remove: ➖ (remove dependencies)
  * upgrade: ⬆️ (upgrade dependencies)
  * downgrade: ⬇️ (downgrade dependencies)
  * move: 🚚 (move/rename files)
  * deploy: 🚀 (deployment)
  * docker: 🐳 (Docker changes)
  * database: 🗃️ (database changes)
  * auth: 🛂 (authorization/permissions)
  * accessibility: ♿ (accessibility improvements)
  * i18n: 🌐 (internationalization)
  * analytics: 📈 (analytics/tracking)
  * architecture: 🏗️ (architectural changes)
  * infrastructure: 🧱 (infrastructure)
  * dx: 🧑‍💻 (developer experience)
  * review: 👌 (code review changes)
  * revert: ⏪️ (revert changes)
  * remove: 🔥 (remove code/files)
  * format: 🎨 (improve format/structure)
  * general: ⚡ (general updates)
  * initial: 🎉 (initial commit)
- Format with Gitmoji for all commit types:
  * Normal: <emoji><type>(<scope>): <subject>
  * Breaking: <emoji><type>!(<scope>): <subject>
  * Revert: <emoji>revert: <hash> <subject>` : ''}
- Subject: max 70 characters, imperative mood, no period, first character lowercase
- Body formatting:
  * Lists: use "- " prefix for bullet points
  * Paragraphs: no prefix, just plain text
  * Explain what and why, not how
- Scope: max 3 words
- For minor changes: use 'fix' instead of 'feat'
- Do not wrap your response in triple backticks
- Response should be the commit message only, no explanations`;

		if (context) {
			userPrompt += `\n\n## Detailed File Analysis:
${context}

Use this detailed analysis to understand:
- What the original files looked like before changes
- What the files look like after changes  
- The specific differences between before and after
- The full context of what was modified, added, or removed`;
		}

		// Add custom prompt if provided
		if (this.config.customPrompt.trim()) {
			userPrompt += `\n\n## Additional requirements:
${this.config.customPrompt}`;
		}

		// Add commit type specific instructions
		if (actualCommitType === "breaking") {
			userPrompt += `\n\n## BREAKING CHANGE Instructions:
- Use the format: <type>!(<scope>): <subject>
- Add "BREAKING CHANGE: <description>" in the footer
- Clearly explain what is breaking and why
- Emphasize the impact on existing code`;
		} else if (actualCommitType === "revert") {
			const recentCommits = await this.getRecentCommits();
			userPrompt += `\n\n## REVERT Instructions:
- Use the format: revert: <original commit hash> <original subject>
- Explain what is being reverted and why
- Justify the revert decision
- Mention the impact of the revert
- If reverting a feature, explain what functionality is lost
- If reverting a fix, explain what issue will resurface
- Include any alternative solutions or workarounds
- Analyze the current changes to determine what is being reverted

## Recent Commits for Context:
${recentCommits}`;
		}

		// Add user feedback for regeneration
		if (userFeedback && userFeedback.trim()) {
			userPrompt += `\n\n## User feedback:
"${userFeedback}"

Please consider this feedback when generating the commit message.`;
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

		// Remove bold formatting (**text**)
		cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");

		// Remove italic formatting (*text*)
		cleaned = cleaned.replace(/\*(.*?)\*/g, "$1");

		// Remove inline code formatting (`text`)
		cleaned = cleaned.replace(/`([^`]*)`/g, "$1");

		// Remove header formatting (# Header)
		cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

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

	async getRecentCommits(limit = 10) {
		// This would get recent commits for better revert context
		// For now, return a placeholder
		return `
Recent commits for context:
- abc1234 feat(auth): add OAuth2 login support
- def5678 fix(api): resolve authentication bug
- ghi9012 docs(readme): update installation guide
- jkl3456 refactor(auth): simplify token validation
- mno7890 perf(database): optimize query performance
`;
	}

	addGitmojiToMessage(message) {
		if (!this.config.useGitmoji) {
			return message;
		}

		// Split message into lines
		const lines = message.split("\n");
		const firstLine = lines[0];

		// Check if the first line already has an emoji
		if (/^[^\w]/.test(firstLine)) {
			return message; // Already has emoji
		}

		// Handle different commit message formats
		let emoji = null;
		let type = null;

		// Format 1: type(scope): subject (normal commits)
		const typeMatch = firstLine.match(/^(\w+)\(/);
		if (typeMatch) {
			type = typeMatch[1];
			emoji = GITMOJI_MAPPINGS[type];
		}

		// Format 2: revert: hash subject (revert commits)
		const revertMatch = firstLine.match(/^revert:\s+/);
		if (revertMatch) {
			type = "revert";
			emoji = GITMOJI_MAPPINGS[type];
		}

		// Format 3: type!(scope): subject (breaking changes)
		const breakingMatch = firstLine.match(/^(\w+)!\(/);
		if (breakingMatch) {
			type = breakingMatch[1];
			emoji = GITMOJI_MAPPINGS[type];
		}

		if (!emoji) {
			return message; // No emoji mapping found
		}

		// Add emoji to the first line (no space after emoji)
		lines[0] = `${emoji}${firstLine}`;
		return lines.join("\n");
	}

	async generateCommitMessage(changes, diff, context, userFeedback = "", commitType = "normal") {
		const provider = PROVIDERS[this.config.provider];
		const apiKey = await this.getApiKey();
		const prompts = await this.getCommitPrompt(changes, diff, context, userFeedback, commitType);

		this.spinner = ora(
			"Analyzing changes and generating commit message...",
		).start();

		try {
			let requestBody;
			let headers = {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			};

			if (this.config.provider === "deepseek") {
				requestBody = {
					model: this.config.model,
					messages: [
						{ role: "system", content: prompts.system },
						{ role: "user", content: prompts.user },
					],
				};
			} else if (this.config.provider === "openai") {
				requestBody = {
					model: this.config.model,
					messages: [
						{ role: "system", content: prompts.system },
						{ role: "user", content: prompts.user },
					],
				};
			} else {
				// OpenRouter
				headers["HTTP-Referer"] =
					"https://github.com/your-username/aicommit-js";
				requestBody = {
					model: this.config.model,
					messages: [
						{ role: "system", content: prompts.system },
						{ role: "user", content: prompts.user },
					],
				};
			}

			const response = await fetch(`${provider.baseUrl}/${provider.endpoint}`, {
				method: "POST",
				headers,
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					`API request failed: ${response.status} ${response.statusText}\n${JSON.stringify(errorData, null, 2)}`,
				);
			}

			const data = await response.json();
			let message = data.choices[0].message.content;

			this.spinner.succeed(" Commit message generated");

			// Clean the message to remove any markdown formatting
			const cleanedMessage = this.cleanCommitMessage(message);
			
			// Add Gitmoji if enabled
			const finalMessage = this.addGitmojiToMessage(cleanedMessage);
			return finalMessage;
		} catch (error) {
			this.spinner.fail("Failed to generate commit message");
			throw error;
		}
	}
}
