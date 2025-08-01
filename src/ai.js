import inquirer from "inquirer";
import ora from "ora";
import {
	PROVIDERS
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

## Format:
<type>(<scope>): <subject>

<body>

IMPORTANT:
- Type must be one of: feat, fix, docs, style, refactor, perf, test, chore
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
					messages: [
						{ role: "user", content: `${prompts.system}\n\n${prompts.user}` },
					],
				};
			} else if (this.config.provider === "deepseek") {
				requestBody = {
					model: this.config.model,
					temperature: 0.3,
					messages: [
						{ role: "system", content: prompts.system },
						{ role: "user", content: prompts.user },
					],
				};
			} else {
				if (this.config.provider === "openrouter") {
					headers["HTTP-Referer"] =
						"https://github.com/your-username/aicommit-js";
				}

				requestBody = {
					model: this.config.model,
					temperature: 0.3,
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

