import path from "path";

// Configuration
export const CONFIG_FILE = path.join(
	process.env.HOME || process.env.USERPROFILE,
	".aicommit.json",
);

export const DEFAULT_CONFIG = {
	provider: "openrouter",
	model: "google/gemini-flash-1.5-8b",
	baseUrl: "https://openrouter.ai/api/v1",
	confirmBeforeCommit: true,
	customPrompt: "",
	language: "en",
};

export const PROVIDERS = {
	openrouter: {
		name: "OpenRouter",
		baseUrl: "https://openrouter.ai/api/v1",
		keyEnv: "OPENROUTER_API_KEY",
		endpoint: "chat/completions",
		models: [
			"google/gemini-flash-1.5-8b",
			"anthropic/claude-3-haiku",
			"openai/gpt-4o-mini",
		],
	},
	openai: {
		name: "OpenAI",
		baseUrl: "https://api.openai.com/v1",
		keyEnv: "OPENAI_API_KEY",
		endpoint: "chat/completions",
		models: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
	},
};

// export const CONVENTIONAL_TYPES = {
// 	feat: "introduce a new feature to the codebase",
// 	fix: "fix a bug in the codebase",
// 	docs: "create/update documentation",
// 	style: "feature and updates related to styling",
// 	refactor: "refactor a specific section of the codebase",
// 	test: "add or update code related to testing",
// 	chore: "regular code maintenance",
// 	perf: "performance improvements",
// 	ci: "continuous integration related",
// 	revert: "reverts a previous commit",
// };

// export const COMMIT_STYLES = {
// 	conventional: {
// 		name: "Conventional Commits",
// 		description:
// 			"Standard format with type, scope, and description following Conventional Commits spec",
// 		template: "<type>(<scope>): <subject>\n\n<body>\n\n<footer>",
// 		example:
// 			"feat(auth): add OAuth2 login support\n\n- implement Google OAuth2 integration\n- add user session management\n- create secure token handling\n\nThis allows users to sign in using their Google accounts\ninstead of creating separate credentials.\n\nCloses #issue-number",
// 	},
// 	detailed: {
// 		name: "Detailed",
// 		description:
// 			"Comprehensive format with type, scope, body, and footer for complex changes",
// 		template: "<type>(<scope>): <subject>\n\n<body>\n\n<footer>",
// 		example:
// 			"feat(auth): add OAuth2 login system\n\n- implement comprehensive authentication system\n- add Google OAuth2 integration\n- create user session management\n- add secure token handling\n\nThis replaces the old password-based system and provides\nbetter security and user experience.\n\nBREAKING CHANGE: removes legacy auth endpoints\nCloses #issue-number",
// 	},
// };

// export const COMMIT_RULES = {
// 	subject: {
// 		maxLength: 50,
// 		rules: [
// 			"Use imperative mood (add, fix, update, not added, fixed, updated)",
// 			"Start with a lowercase verb (except for proper nouns)",
// 			"No period at the end",
// 			"Be specific and descriptive",
// 			"Focus on WHAT and WHY, not just HOW",
// 		],
// 	},
// 	body: {
// 		maxLineLength: 72,
// 		rules: [
// 			"Explain the motivation for the change",
// 			"Contrast with previous behavior",
// 			"Use present tense",
// 			"Wrap lines at 72 characters",
// 			"Separate paragraphs with blank lines",
// 			"Include context that reviewers need",
// 		],
// 	},
// 	footer: {
// 		rules: [
// 			'Use "BREAKING CHANGE:" for breaking changes',
// 		],
// 	},
// };

