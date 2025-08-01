import fs from "fs";
import chalk from "chalk";
import inquirer from "inquirer";
import { CONFIG_FILE, DEFAULT_CONFIG, PROVIDERS } from "./constants.js";

export class ConfigManager {
	constructor() {
		this.config = this.loadConfig();
	}

	loadConfig() {
		try {
			if (fs.existsSync(CONFIG_FILE)) {
				const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
				const merged = { ...DEFAULT_CONFIG, ...config };
				// Remove commitStyle from old config files since we no longer use it
				delete merged.commitStyle;
				return merged;
			}
		} catch (error) {
			console.warn(
				chalk.yellow("Warning: Could not load config file, using defaults"),
			);
		}
		return { ...DEFAULT_CONFIG };
	}

	saveConfig() {
		try {
			fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
			console.log(chalk.green("Configuration saved"));
		} catch (error) {
			console.error(chalk.red("Failed to save configuration:"), error.message);
		}
	}

	getConfig() {
		return this.config;
	}

	updateConfig(newConfig) {
		this.config = { ...this.config, ...newConfig };
	}

	async configure() {
		console.log(chalk.blue.bold("Configuration Setup\n"));

		const answers = await inquirer.prompt([
			{
				type: "list",
				name: "provider",
				message: "Select AI provider:",
				choices: Object.entries(PROVIDERS).map(([key, value]) => ({
					name: value.name,
					value: key,
				})),
				default: this.config.provider,
			},
			{
				type: "list",
				name: "modelChoice",
				message: "Select model:",
				choices: (answers) => [
					...PROVIDERS[answers.provider].models.map((model) => ({
						name: model,
						value: model,
					})),
					{
						name: "Custom model (type manually)",
						value: "custom",
					},
				],
				default: this.config.model,
			},
			{
				type: "input",
				name: "model",
				message: "Enter custom model name:",
				when: (answers) => answers.modelChoice === "custom",
				validate: (input) =>
					input.trim().length > 0 || "Model name is required",
			},
			{
				type: "input",
				name: "customPrompt",
				message: "Custom prompt requirements (optional):",
				default: this.config.customPrompt,
			},
			{
				type: "confirm",
				name: "confirmBeforeCommit",
				message: "Confirm before committing?",
				default: this.config.confirmBeforeCommit,
			},
			{
				type: "confirm",
				name: "useGitmoji",
				message: "Use Gitmoji in commit messages? (✨ feat, 🐛 fix, etc.)",
				default: this.config.useGitmoji,
			},
		]);

		// Handle model selection
		if (answers.modelChoice && answers.modelChoice !== "custom") {
			answers.model = answers.modelChoice;
		}
		delete answers.modelChoice;

		this.config = { ...this.config, ...answers };
		this.saveConfig();
	}

	showConfig() {
		console.log(chalk.blue.bold("Current Configuration\n"));

		const configDisplay = {
			Provider: PROVIDERS[this.config.provider].name,
			Model: this.config.model,
			"Custom Prompt": this.config.customPrompt || "(none)",
			"Confirm Before Commit": this.config.confirmBeforeCommit ? "Yes" : "No",
			"Use Gitmoji": this.config.useGitmoji ? "Yes" : "No",
		};

		Object.entries(configDisplay).forEach(([key, value]) => {
			console.log(`${chalk.cyan(key.padEnd(20))}: ${chalk.white(value)}`);
		});

		// Show commit message example
		console.log(`\n${chalk.cyan("Example commit message:")}`);
		const exampleMessage = this.config.useGitmoji 
			? `✨ feat(auth): add OAuth2 login support

- implement Google OAuth2 integration
- add user session management
- create secure token handling

This replaces the old password-based system and provides
better security and user experience.

Examples of other Gitmoji types:
🐛 fix(api): resolve authentication bug
📚 docs(readme): update installation guide
🔨 refactor(auth): simplify token validation
🐎 perf(database): optimize query performance
🔒 security(auth): fix JWT token vulnerability
🚀 deploy(prod): release to production
🐳 docker(api): update container configuration
🔖 release(v2.1.0): bump version to 2.1.0
🎉 initial: first commit`
			: `feat(auth): add OAuth2 login support

- implement Google OAuth2 integration
- add user session management
- create secure token handling

This replaces the old password-based system and provides
better security and user experience.`;
		console.log(chalk.gray(exampleMessage));

		// Show commit rules
		console.log(`\n${chalk.cyan("Commit Message Rules:")}`);
		console.log(chalk.gray("Format: <type>(<scope>): <subject>"));
		console.log(
			chalk.gray("Types: feat, fix, docs, style, refactor, perf, test, chore"),
		);
		console.log(
			chalk.gray("Subject: max 70 characters, imperative mood, no period"),
		);
		console.log(
			chalk.gray("Body: list changes to explain what and why, not how"),
		);
		console.log(chalk.gray("Scope: max 3 words"));
		console.log(chalk.gray("For minor changes: use 'fix' instead of 'feat'"));
	}

	showInfo() {
		console.log(chalk.blue.bold("Model and Provider Information\n"));

		const provider = PROVIDERS[this.config.provider];

		console.log(chalk.cyan.bold("Provider:"));
		console.log(`  Name: ${chalk.white(provider.name)}`);
		console.log(`  Base URL: ${chalk.white(provider.baseUrl)}`);
		console.log(`  Environment Variable: ${chalk.white(provider.keyEnv)}`);
		console.log(`  Endpoint: ${chalk.white(provider.endpoint)}`);

		console.log(chalk.cyan.bold("\nModel:"));
		console.log(`  Current Model: ${chalk.white(this.config.model)}`);
		console.log(`  Provider: ${chalk.white(provider.name)}`);

		console.log(chalk.cyan.bold("\nAvailable Models:"));
		provider.models.forEach((model) => {
			const isCurrent = model === this.config.model;
			const display = isCurrent ? `${model} (current)` : model;
			console.log(
				`  ${isCurrent ? chalk.green("•") : chalk.gray("•")} ${chalk.white(display)}`,
			);
		});

		console.log(chalk.cyan.bold("\nAPI Configuration:"));
		console.log(`  Base URL: ${chalk.white(this.config.baseUrl)}`);
		console.log(`  API Key: ${chalk.white(provider.keyEnv)}`);

		if (this.config.provider === "openrouter") {
			console.log(chalk.cyan.bold("\nOpenRouter Specific:"));
			console.log("  • Supports multiple AI providers");
			console.log("  • Requires HTTP-Referer header");
			console.log("  • Unified API for different models");
		} else if (this.config.provider === "deepseek") {
			console.log(chalk.cyan.bold("\nDeepSeek Specific:"));
			console.log("  • Specialized in coding and technical tasks");
			console.log("  • Uses standard OpenAI-compatible API format");
			console.log("  • Optimized for code generation and analysis");
		} else {
			console.log(chalk.cyan.bold("\nOpenAI Specific:"));
			console.log("  • Standard OpenAI API format");
			console.log("  • Direct access to OpenAI models");
			console.log("  • No additional headers required");
		}

		console.log(chalk.cyan.bold("\nUsage Tips:"));
		console.log("  • Set your API key as an environment variable");
		console.log(`  • Example: export ${provider.keyEnv}="your-api-key"`);
		console.log("  • Different models may have different capabilities");
		console.log("  • Some models are faster, others more accurate");
		console.log("  • Experiment with different models for best results");
	}

	resetConfig() {
		this.config = { ...DEFAULT_CONFIG };
		this.saveConfig();
	}
}
