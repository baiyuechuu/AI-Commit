import chalk from "chalk";
import inquirer from "inquirer";
import { ConfigManager } from "./config.js";
import { GitManager } from "./git.js";
import { AIService } from "./ai.js";
import { RulesManager } from "./rules.js";

export class AICommit {
	constructor() {
		this.configManager = new ConfigManager();
		this.config = this.configManager.getConfig();
		this.gitManager = new GitManager(this.config);
		this.aiService = new AIService(this.config);
		this.rulesManager = new RulesManager(this.config);
	}

	async run(options = {}) {
		try {
			console.log(chalk.blue.bold("🤖 AI Commit Message Generator"));
			console.log(chalk.gray("━".repeat(60)));
			console.log(chalk.white("Intelligent commit messages powered by AI"));
			console.log(chalk.gray("━".repeat(60)));
			console.log();

			// Get git changes
			const { changes, diff, context } = await this.gitManager.getGitChanges();

			// Show detailed changes overview
			console.log(chalk.cyan.bold("📋 Changes Overview:"));
			console.log(this.gitManager.formatChanges(changes));
			console.log();

			// Show diff summary if available
			if (diff && diff.trim()) {
				console.log(chalk.yellow.bold("📝 Diff Summary:"));
				console.log(this.formatDiffSummary(diff));
				console.log();
			}

			// Ask user if they want to continue
			if (!options.yes) {
				const shouldContinue = await inquirer.prompt([
					{
						type: "confirm",
						name: "proceed",
						message: "Generate commit message for these changes?",
						default: true,
					},
				]);

				if (!shouldContinue.proceed) {
					console.log(chalk.yellow("Operation cancelled"));
					return;
				}
			}

			// Generate commit message
			let commitMessage = await this.aiService.generateCommitMessage(
				changes,
				diff,
				context,
			);

			// Display generated message with enhanced formatting
			this.displayCommitMessage(commitMessage);

			// Interactive commit message refinement
			commitMessage = await this.handleUserInteraction(
				commitMessage,
				changes,
				diff,
				context,
				options,
			);

			// Commit changes
			await this.gitManager.commitChanges(commitMessage, options.push);

			// Success message with enhanced formatting
			console.log();
			console.log(chalk.green.bold("🎉 Success!"));
			console.log(chalk.white("━".repeat(50)));

			if (options.push) {
				console.log(chalk.green("✅ Changes committed and pushed to remote"));
				console.log(
					chalk.gray(
						"   Your changes are now available on the remote repository",
					),
				);
			} else {
				console.log(chalk.green("✅ Changes committed successfully"));
				console.log(
					chalk.gray('   Use "git push" to sync with remote repository'),
				);
			}

			console.log(chalk.white("━".repeat(50)));
			console.log(
				chalk.blue('💡 Tip: Use "git log --oneline -1" to see your commit'),
			);
		} catch (error) {
			console.log();
			console.log(chalk.red.bold("❌ Error"));
			console.log(chalk.white("━".repeat(50)));
			console.log(chalk.red(error.message));
			console.log(chalk.white("━".repeat(50)));
			console.log(
				chalk.yellow(
					"💡 Tip: Make sure you have staged changes and proper git configuration",
				),
			);
			process.exit(1);
		}
	}

	formatDiffSummary(diff) {
		const lines = diff.split("\n");
		let addedLines = 0;
		let removedLines = 0;
		const changedFiles = new Set();

		for (const line of lines) {
			if (line.startsWith("+") && !line.startsWith("+++")) addedLines++;
			if (line.startsWith("-") && !line.startsWith("---")) removedLines++;
			if (line.startsWith("diff --git")) {
				const match = line.match(/diff --git a\/(.+) b\/(.+)/);
				if (match) changedFiles.add(match[1]);
			}
		}

		const summary = [
			chalk.green(`+${addedLines} additions`),
			chalk.red(`-${removedLines} deletions`),
			chalk.blue(`${changedFiles.size} files changed`),
		].join(", ");

		return summary;
	}

	displayCommitMessage(message) {
		console.log(chalk.green.bold("🤖 Generated Commit Message:"));
		console.log();

		const lines = message.split("\n");
		lines.forEach((line, index) => {
			if (index === 0) {
				// Subject line in bold cyan
				console.log(chalk.bold.cyan(line));
			} else if (line.trim() === "") {
				// Empty line
				console.log();
			} else {
				// Body lines in gray
				console.log(chalk.gray(line));
			}
		});

		console.log();
	}

	async handleUserInteraction(commitMessage, changes, diff, context, options) {
		if (options.yes) {
			return commitMessage;
		}

		while (true) {
			const action = await inquirer.prompt([
				{
					type: "list",
					name: "choice",
					message: "What would you like to do?",
					choices: [
						{ name: "✅ Use this message", value: "use" },
						{ name: "✏  Edit message", value: "edit" },
						{ name: "🔄 Regenerate message", value: "regenerate" },
						{ name: "❌ Cancel", value: "cancel" },
					],
				},
			]);

			switch (action.choice) {
				case "use":
					const pushDecision = await inquirer.prompt([
						{
							type: "confirm",
							name: "push",
							message: "Push to remote after committing?",
							default: false,
						},
					]);
					options.push = pushDecision.push;
					return commitMessage;

				case "edit":
					commitMessage = await this.editCommitMessage(commitMessage);
					this.displayCommitMessage(commitMessage);
					break;

				case "regenerate":
					const feedback = await inquirer.prompt([
						{
							type: "input",
							name: "feedback",
							message: "Any specific feedback for regeneration? (optional):",
							default: "",
						},
					]);

					console.log(chalk.blue("🔄 Regenerating commit message..."));
					commitMessage = await this.aiService.generateCommitMessage(
						changes,
						diff,
						context,
						feedback.feedback,
					);
					this.displayCommitMessage(commitMessage);
					break;

				case "cancel":
					console.log(chalk.yellow("Operation cancelled"));
					process.exit(0);
			}
		}
	}

	async editCommitMessage(message) {
		const edited = await inquirer.prompt([
			{
				type: "editor",
				name: "message",
				message: "Edit the commit message:",
				default: message,
				postfix: ".txt",
			},
		]);

		return edited.message.trim();
	}

	async configure() {
		await this.configManager.configure();
		// Update local config reference
		this.config = this.configManager.getConfig();
		// Update other managers with new config
		this.gitManager = new GitManager(this.config);
		this.aiService = new AIService(this.config);
		this.rulesManager = new RulesManager(this.config);
	}

	showConfig() {
		this.configManager.showConfig();
	}

	showRules() {
		this.rulesManager.showRules();
	}

	async resetConfig() {
		const answers = await inquirer.prompt([
			{
				type: "confirm",
				name: "confirm",
				message: "Are you sure you want to reset configuration to defaults?",
				default: false,
			},
		]);

		if (answers.confirm) {
			this.configManager.resetConfig();
			// Update local config reference
			this.config = this.configManager.getConfig();
			// Update other managers with new config
			this.gitManager = new GitManager(this.config);
			this.aiService = new AIService(this.config);
			this.rulesManager = new RulesManager(this.config);
			console.log(chalk.green("Configuration reset to defaults"));
		}
	}
}

