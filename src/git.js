import { execSync, spawn } from "child_process";
import chalk from "chalk";
import ora from "ora";

export class GitManager {
	constructor(config) {
		this.config = config;
		this.spinner = null;
	}

	async getGitChanges() {
		try {
			// Check if we're in a git repository
			execSync("git rev-parse --git-dir", { stdio: "ignore" });

			// Auto stage if enabled
			if (this.config.autoStage) {
				this.spinner = ora("Staging changes...").start();
				execSync("git add .", { stdio: "ignore" });
				this.spinner.succeed(" Changes staged");
			}

			// Get staged changes
			const changes = execSync("git diff --cached --name-status", {
				encoding: "utf8",
			}).trim();
			let diff = execSync("git diff --cached", { encoding: "utf8" }).trim();

			if (!changes) {
				throw new Error(
					"No staged changes found. Please stage your changes first.",
				);
			}

			// Limit diff size for better AI processing
			if (
				this.config.maxDiffLines &&
				diff.split("\n").length > this.config.maxDiffLines
			) {
				const diffLines = diff.split("\n");
				diff =
					diffLines.slice(0, this.config.maxDiffLines).join("\n") +
					`\n... (truncated, showing first ${this.config.maxDiffLines} lines)`;
			}

			// Get additional context if enabled
			let context = "";
			if (this.config.includeContext) {
				try {
					// Get current branch
					const branch = execSync("git branch --show-current", {
						encoding: "utf8",
					}).trim();

					// Get recent commits for context (last 3)
					const recentCommits = execSync("git log --oneline -3", {
						encoding: "utf8",
					}).trim();

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
		const lines = changes.split("\n").filter((line) => line.trim());

		// Group files by status for better organization
		const grouped = {
			added: [],
			modified: [],
			deleted: [],
			renamed: [],
			copied: [],
			other: [],
		};

		lines.forEach((line) => {
			const [status, ...fileParts] = line.split("\t");
			const file = fileParts.join("\t");

			switch (status) {
				case "A":
					grouped.added.push(file);
					break;
				case "M":
					grouped.modified.push(file);
					break;
				case "D":
					grouped.deleted.push(file);
					break;
				case "R":
					grouped.renamed.push(file);
					break;
				case "C":
					grouped.copied.push(file);
					break;
				default:
					grouped.other.push(`${status}\t${file}`);
					break;
			}
		});

		let output = [];

		if (grouped.added.length > 0) {
			output.push(chalk.green.bold("📄 Added Files:"));
			grouped.added.forEach((file) => {
				output.push(`   ${chalk.green("+")} ${chalk.white(file)}`);
			});
			output.push("");
		}

		if (grouped.modified.length > 0) {
			output.push(chalk.yellow.bold("📝 Modified Files:"));
			grouped.modified.forEach((file) => {
				output.push(`   ${chalk.yellow("~")} ${chalk.white(file)}`);
			});
			output.push("");
		}

		if (grouped.deleted.length > 0) {
			output.push(chalk.red.bold("🗑  Deleted Files:"));
			grouped.deleted.forEach((file) => {
				output.push(`   ${chalk.red("-")} ${chalk.white(file)}`);
			});
			output.push("");
		}

		if (grouped.renamed.length > 0) {
			output.push(chalk.blue.bold("🔄 Renamed Files:"));
			grouped.renamed.forEach((file) => {
				output.push(`   ${chalk.blue("→")} ${chalk.white(file)}`);
			});
			output.push("");
		}

		if (grouped.copied.length > 0) {
			output.push(chalk.magenta.bold("📋 Copied Files:"));
			grouped.copied.forEach((file) => {
				output.push(`   ${chalk.magenta("C")} ${chalk.white(file)}`);
			});
			output.push("");
		}

		if (grouped.other.length > 0) {
			output.push(chalk.gray.bold("❓ Other Changes:"));
			grouped.other.forEach((file) => {
				output.push(`   ${chalk.gray("?")} ${chalk.white(file)}`);
			});
			output.push("");
		}

		// Add summary line
		const totalFiles = lines.length;
		const summary = [
			grouped.added.length > 0
				? chalk.green(`${grouped.added.length} added`)
				: null,
			grouped.modified.length > 0
				? chalk.yellow(`${grouped.modified.length} modified`)
				: null,
			grouped.deleted.length > 0
				? chalk.red(`${grouped.deleted.length} deleted`)
				: null,
			grouped.renamed.length > 0
				? chalk.blue(`${grouped.renamed.length} renamed`)
				: null,
			grouped.copied.length > 0
				? chalk.magenta(`${grouped.copied.length} copied`)
				: null,
		]
			.filter(Boolean)
			.join(", ");

		if (summary) {
			output.push(
				chalk.white.bold(`📊 Summary: ${summary} (${totalFiles} total files)`),
			);
		}

		return output.join("\n");
	}

	async commitChanges(message, push = false) {
		try {
			this.spinner = ora("Committing changes...").start();

			// Use spawn to properly handle commit messages with special characters
			const gitProcess = spawn("git", ["commit", "-m", message], {
				stdio: "ignore",
			});

			await new Promise((resolve, reject) => {
				gitProcess.on("close", (code) => {
					if (code === 0) {
						this.spinner.succeed("Changes committed");
						resolve();
					} else {
						this.spinner.fail();
						reject(new Error(`Git commit failed with code ${code}`));
					}
				});

				gitProcess.on("error", (error) => {
					this.spinner.fail();
					reject(error);
				});
			});

			if (push) {
				this.spinner = ora("Pushing to origin...").start();
				execSync("git push origin", { stdio: "ignore" });
				this.spinner.succeed("Changes pushed to origin");
			}
		} catch (error) {
			if (this.spinner) this.spinner.fail();
			throw error;
		}
	}
}

