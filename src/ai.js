import inquirer from "inquirer";
import ora from "ora";
import {
	PROVIDERS,
	// COMMIT_STYLES,
	// COMMIT_RULES,
	// CONVENTIONAL_TYPES,
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

## Format:
<type>(<scope>): <subject>

<body>

IMPORTANT:
- Type must be one of: feat, fix, docs, style, refactor, perf, test, chore
- Subject: max 70 characters, imperative mood, no period
- Body: list changes to explain what and why, not how
- Scope: max 3 words
- For minor changes: use 'fix' instead of 'feat'
- Do not wrap your response in triple backticks
- Response should be the commit message only, no explanations`;



		if (context) {
			userPrompt += `\n\n## Context:
${context}`;
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

