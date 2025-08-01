import { execSync, spawn } from "child_process";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";

export class GitManager {
	constructor(config) {
		this.config = config;
		this.spinner = null;
	}

	async getGitChanges() {
		try {
			// Check if we're in a git repository
			execSync("git rev-parse --git-dir", { stdio: "ignore" });

			// Check for staged changes first
			let stagedChanges = execSync("git diff --cached --name-status", {
				encoding: "utf8",
			}).trim();

			// If no staged changes, show file selection
			if (!stagedChanges) {
				await this.selectFilesToStage();
				// Get staged changes after selection
				stagedChanges = execSync("git diff --cached --name-status", {
					encoding: "utf8",
				}).trim();
			}

			const changes = stagedChanges;
			let diff = execSync("git diff --cached", { encoding: "utf8" }).trim();

			if (!changes) {
				throw new Error(
					"No files staged for commit. Please stage files first.",
				);
			}

			// Use full diff without truncation

			// Get staged file contents as context
			let context = "";
			try {
				context = await this.getStagedFileContents(changes);
			} catch (error) {
				// Context is optional, continue without it
				console.warn("Warning: Could not get staged file contents for context");
			}

			return { changes, diff, context };
		} catch (error) {
			if (this.spinner) this.spinner.fail();
			throw error;
		}
	}

	async getStagedFileContents(changes) {
		const lines = changes.split("\n").filter((line) => line.trim());
		let context = "STAGED FILE CONTENTS:\n\n";

		for (const line of lines) {
			const [status, ...fileParts] = line.split("\t");
			const file = fileParts.join("\t");

			// Skip deleted files
			if (status === "D") {
				context += `${file}: [DELETED]\n\n`;
				continue;
			}

			try {
				// Get staged content of the file
				const fileContent = execSync(`git show :"${file}"`, {
					encoding: "utf8",
					maxBuffer: 1024 * 1024, // 1MB limit
				});

				// Limit content length for AI processing
				const maxLines = 100;
				const contentLines = fileContent.split("\n");
				const truncatedContent =
					contentLines.length > maxLines
						? contentLines.slice(0, maxLines).join("\n") +
							`\n... (truncated, showing first ${maxLines} lines)`
						: fileContent;

				context += `=== ${file} ===\n${truncatedContent}\n\n`;
			} catch (error) {
				// If we can't get file content, note it
				context += `${file}: [UNABLE TO READ CONTENT]\n\n`;
			}
		}

		return context;
	}

	async selectFilesToStage() {
		// Get unstaged changes
		const unstagedFiles = execSync("git diff --name-only", {
			encoding: "utf8",
		}).trim();
		const untrackedFiles = execSync(
			"git ls-files --others --exclude-standard",
			{
				encoding: "utf8",
			},
		).trim();

		const allFiles = [];
		if (unstagedFiles) {
			allFiles.push(
				...unstagedFiles
					.split("\n")
					.map((file) => ({ name: file, status: "modified" })),
			);
		}
		if (untrackedFiles) {
			allFiles.push(
				...untrackedFiles
					.split("\n")
					.map((file) => ({ name: file, status: "untracked" })),
			);
		}

		if (allFiles.length === 0) {
			throw new Error("No unstaged files found. Make some changes first.");
		}

		console.log(chalk.cyan.bold("Available Files:"));
		allFiles.forEach((file) => {
			const statusColor =
				file.status === "untracked" ? chalk.green : chalk.yellow;
			const statusIcon = file.status === "untracked" ? "+" : "~";
			console.log(
				`   ${statusColor(statusIcon)} ${chalk.white(file.name)} ${chalk.gray(`(${file.status})`)}`,
			);
		});
		console.log();

		const choices = [
			{ name: "Stage all files for commit", value: "all" },
			{ name: "Select specific files to stage", value: "select" },
			{ name: "Cancel", value: "cancel" },
		];

		const action = await inquirer.prompt([
			{
				type: "list",
				name: "choice",
				message: "How would you like to stage files for commit?",
				choices: choices,
			},
		]);

		if (action.choice === "cancel") {
			throw new Error("Operation cancelled by user.");
		}

		if (action.choice === "all") {
			this.spinner = ora("Staging all files for commit...").start();
			execSync("git add .", { stdio: "ignore" });
			this.spinner.succeed(" All files staged for commit");
		} else {
			const fileChoices = allFiles.map((file) => ({
				name: `${file.status === "untracked" ? "+" : "~"} ${file.name} (${file.status})`,
				value: file.name,
				checked: false,
			}));

			const selectedFiles = await inquirer.prompt([
				{
					type: "checkbox",
					name: "files",
					message: "Select files to stage for commit:",
					choices: fileChoices,
					validate: (answer) => {
						if (answer.length < 1) {
							return "You must choose at least one file.";
						}
						return true;
					},
				},
			]);

			this.spinner = ora("Staging selected files for commit...").start();
			for (const file of selectedFiles.files) {
				execSync(`git add "${file}"`, { stdio: "ignore" });
			}
			this.spinner.succeed(
				` ${selectedFiles.files.length} files staged for commit`,
			);
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
			output.push(chalk.green.bold("Added Files:"));
			grouped.added.forEach((file) => {
				output.push(`   ${chalk.green("+")} ${chalk.white(file)}`);
			});
			output.push("");
		}

		if (grouped.modified.length > 0) {
			output.push(chalk.yellow.bold("Modified Files:"));
			grouped.modified.forEach((file) => {
				output.push(`   ${chalk.yellow("~")} ${chalk.white(file)}`);
			});
			output.push("");
		}

		if (grouped.deleted.length > 0) {
			output.push(chalk.red.bold("Deleted Files:"));
			grouped.deleted.forEach((file) => {
				output.push(`   ${chalk.red("-")} ${chalk.white(file)}`);
			});
			output.push("");
		}

		if (grouped.renamed.length > 0) {
			output.push(chalk.blue.bold("Renamed Files:"));
			grouped.renamed.forEach((file) => {
				output.push(`   ${chalk.blue("→")} ${chalk.white(file)}`);
			});
			output.push("");
		}

		if (grouped.copied.length > 0) {
			output.push(chalk.magenta.bold("Copied Files:"));
			grouped.copied.forEach((file) => {
				output.push(`   ${chalk.magenta("C")} ${chalk.white(file)}`);
			});
			output.push("");
		}

		if (grouped.other.length > 0) {
			output.push(chalk.gray.bold("Other Changes:"));
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
				chalk.white.bold(`Summary: ${summary} (${totalFiles} total files)`),
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
