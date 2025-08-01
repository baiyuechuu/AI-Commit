import chalk from "chalk";

export class RulesManager {
	constructor(config) {
		this.config = config;
	}

	showRules() {
		console.log(chalk.blue.bold("Commit Message Best Practices\n"));

		console.log(chalk.cyan.bold("Format:"));
		console.log("  <type>(<scope>): <subject>");
		console.log("  ");
		console.log("  <body>");

		console.log(chalk.cyan.bold("\nTypes (lowercase):"));
		console.log("  • feat: introduce a new feature to the codebase");
		console.log("  • fix: fix a bug in the codebase");
		console.log("  • docs: create/update documentation");
		console.log("  • style: feature and updates related to styling");
		console.log("  • refactor: refactor a specific section of the codebase");
		console.log("  • test: add or update code related to testing");
		console.log("  • chore: regular code maintenance");
		console.log("  • perf: performance improvements");

		console.log(chalk.cyan.bold("\nSubject Line Rules:"));
		console.log("  • Max 70 characters");
		console.log("  • Use imperative mood (add, fix, update, not added, fixed, updated)");
		console.log("  • Start with lowercase letter (except proper nouns like API, OAuth)");
		console.log("  • No period at the end");
		console.log("  • Be specific and descriptive");

		console.log(chalk.cyan.bold("\nBody Rules:"));
		console.log("  • Lists: use '- ' prefix for bullet points");
		console.log("  • Paragraphs: no prefix, just plain text");
		console.log("  • Explain what and why, not how");
		console.log("  • Keep lines under 72 characters");
		console.log("  • Separate paragraphs with blank lines");
		console.log("  • Include context that reviewers need");

		console.log(chalk.cyan.bold("\nScope Rules:"));
		console.log("  • Max 3 words");
		console.log("  • Use lowercase, concise names");
		console.log("  • Common scopes: auth, api, ui, cli, config, db, test, build");

		console.log(chalk.cyan.bold("\nExamples:"));
		console.log("  feat(auth): add OAuth2 login support");
		console.log("  ");
		console.log("  - implement Google OAuth2 integration");
		console.log("  - add user session management");
		console.log("  - create secure token handling");
		console.log("  ");
		console.log("  This allows users to sign in using their Google accounts");
		console.log("  instead of creating separate credentials.");

		console.log(chalk.cyan.bold("\nBreaking Changes:"));
		console.log('  • Use "!" after type: feat!: or feat(scope)!:');
		console.log('  • Or use footer: "BREAKING CHANGE: <description>"');
		console.log(chalk.gray("\n  Example:"));
		console.log(
			chalk.gray("  chore!: update Python version to use newer libs\n"),
		);
		console.log(chalk.gray("  - drop support for Python 3.6"));
		console.log(chalk.gray("  - add support for Python 3.12"));
		console.log(chalk.gray("  - update project dependencies\n"));
		console.log(
			chalk.gray(
				"  More recent versions of important project libs no longer",
			),
		);
		console.log(
			chalk.gray(
				"  support Python 3.6. This has prevented us from using new",
			),
		);
		console.log(chalk.gray("  features offered by such libs.\n"));
		console.log(chalk.gray("  BREAKING CHANGE: drop support for Python 3.6"));

		console.log(chalk.cyan.bold("\nImportant Guidelines:"));
		console.log("  • For minor changes: use 'fix' instead of 'feat'");
		console.log("  • Do not wrap response in triple backticks");
		console.log("  • Response should be the commit message only, no explanations");
	}
}

