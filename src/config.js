import fs from "fs";
import chalk from "chalk";
import inquirer from "inquirer";
import {
	CONFIG_FILE,
	DEFAULT_CONFIG,
	PROVIDERS,
	COMMIT_STYLES,
} from "./constants.js";

export class ConfigManager {
	constructor() {
		this.config = this.loadConfig();
	}

	loadConfig() {
		try {
			if (fs.existsSync(CONFIG_FILE)) {
				const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
				return { ...DEFAULT_CONFIG, ...config };
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
				type: "list",
				name: "commitStyle",
				message: "Select commit style:",
				choices: Object.entries(COMMIT_STYLES).map(([key, value]) => ({
					name: `${value.name} - ${value.description}`,
					value: key,
					short: value.name,
				})),
				default: this.config.commitStyle,
			},
			{
				type: "number",
				name: "temperature",
				message: "Temperature (0.0-1.0, lower = more consistent):",
				default: this.config.temperature,
				validate: (value) =>
					(value >= 0 && value <= 1) ||
					"Temperature must be between 0.0 and 1.0",
			},
			{
				type: "number",
				name: "maxTokens",
				message: "Max tokens for response:",
				default: this.config.maxTokens,
				validate: (value) =>
					(value > 0 && value <= 4000) ||
					"Max tokens must be between 1 and 4000",
			},
			{
				type: "number",
				name: "maxDiffLines",
				message: "Max diff lines to analyze (prevents token overflow):",
				default: this.config.maxDiffLines,
				validate: (value) =>
					(value > 0 && value <= 2000) ||
					"Max diff lines must be between 1 and 2000",
			},
			{
				type: "confirm",
				name: "includeContext",
				message: "Include repository context (branch, recent commits)?",
				default: this.config.includeContext,
			},
			{
				type: "input",
				name: "customPrompt",
				message: "Custom prompt requirements (optional):",
				default: this.config.customPrompt,
			},
			{
				type: "confirm",
				name: "autoStage",
				message: "Auto-stage all changes?",
				default: this.config.autoStage,
			},
			{
				type: "confirm",
				name: "confirmBeforeCommit",
				message: "Confirm before committing?",
				default: this.config.confirmBeforeCommit,
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
			"Commit Style": COMMIT_STYLES[this.config.commitStyle].name,
			Temperature: this.config.temperature,
			"Max Tokens": this.config.maxTokens,
			"Max Diff Lines": this.config.maxDiffLines,
			"Include Context": this.config.includeContext ? "Yes" : "No",
			"Custom Prompt": this.config.customPrompt || "(none)",
			"Auto Stage": this.config.autoStage ? "Yes" : "No",
			"Confirm Before Commit": this.config.confirmBeforeCommit ? "Yes" : "No",
		};

		Object.entries(configDisplay).forEach(([key, value]) => {
			console.log(`${chalk.cyan(key.padEnd(20))}: ${chalk.white(value)}`);
		});

		// Show commit style example
		const style = COMMIT_STYLES[this.config.commitStyle];
		console.log(`\n${chalk.cyan("Example commit message:")}`);
		console.log(chalk.gray(style.example));

		// Show commit rules
		console.log(`\n${chalk.cyan("Commit Message Rules:")}`);
		if (this.config.commitStyle === "conventional") {
			console.log(
				chalk.gray(
					"Subject: ≤50 chars, lowercase format, imperative mood, no period",
				),
			);
		} else {
			console.log(
				chalk.gray(
					"Subject: ≤50 chars, imperative mood, capitalized, no period",
				),
			);
		}
		console.log(
			chalk.gray("Body: ≤72 chars per line, explain why and context"),
		);
		console.log(chalk.gray("Footer: Reference issues, breaking changes"));
	}

	resetConfig() {
		this.config = { ...DEFAULT_CONFIG };
		this.saveConfig();
	}
}

