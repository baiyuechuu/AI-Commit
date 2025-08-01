import path from "path";

// Configuration
export const CONFIG_FILE = path.join(
	process.env.HOME || process.env.USERPROFILE,
	".aicommit.json",
);

export const DEFAULT_CONFIG = {
	provider: "deepseek",
	model: "deepseek-chat",
	baseUrl: "https://api.deepseek.com/v1",
	confirmBeforeCommit: true,
	customPrompt: "",
	language: "en",
	useGitmoji: false,
	contextSizeLimit: 10000, // Token limit for context (conservative default)
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
	deepseek: {
		name: "DeepSeek",
		baseUrl: "https://api.deepseek.com/v1",
		keyEnv: "DEEPSEEK_API_KEY",
		endpoint: "chat/completions",
		models: ["deepseek-chat", "deepseek-reasoner"],
	},
};

// Gitmoji mappings for commit types
// Inspired by dannyfritz/commit-message-emoji and gitmoji
export const GITMOJI_MAPPINGS = {
	// Core commit types
	feat: "✨",      // New feature (sparkles)
	fix: "🐛",       // Bugfix
	docs: "📚",      // Documentation (books)
	style: "💄",     // Cosmetic (lipstick)
	refactor: "🔨",  // Refactor code (hammer)
	perf: "🐎",      // Performance (racehorse)
	test: "🚨",      // Tests (rotating_light)
	chore: "🔧",     // Configuration files (wrench)
	build: "📦",     // Package.json in JS (package)
	ci: "👷",        // Adding CI build system (construction_worker)
	
	// Additional types
	hotfix: "🚑",    // Critical hotfix (ambulance)
	security: "🔒",  // Security (lock)
	release: "🔖",   // Version tag (bookmark)
	initial: "🎉",   // Initial commit (tada)
	metadata: "📇",  // Metadata (card_index)
	code_docs: "💡", // Documenting source code (bulb)
	general: "⚡",   // General update (zap)
	format: "🎨",    // Improve format/structure (art)
	remove: "🔥",    // Removing code/files (fire)
	ci_fix: "💚",    // Continuous Integration (green_heart)
	upgrade: "⬆️",   // Upgrading dependencies (arrow_up)
	downgrade: "⬇️", // Downgrading dependencies (arrow_down)
	lint: "👕",      // Lint (shirt)
	translation: "👽", // Translation (alien)
	text: "✏️",      // Text (pencil)
	deploy: "🚀",    // Deploying stuff (rocket)
	macos: "🍎",     // Fixing on MacOS (apple)
	linux: "🐧",     // Fixing on Linux (penguin)
	windows: "🏁",   // Fixing on Windows (checkered_flag)
	wip: "🚧",       // Work in progress (construction)
	analytics: "📈", // Analytics or tracking code (chart_with_upwards_trend)
	deps_remove: "➖", // Removing a dependency (heavy_minus_sign)
	deps_add: "➕",   // Adding a dependency (heavy_plus_sign)
	docker: "🐳",    // Docker (whale)
	merge: "🔀",     // Merging branches (twisted_rightwards_arrows)
	bad_code: "💩",  // Bad code / need improv. (hankey)
	revert: "⏪️",    // Reverting changes (rewind)
	breaking: "💥",  // Breaking changes (boom)
	review: "👌",    // Code review changes (ok_hand)
	accessibility: "♿", // Accessibility (wheelchair)
	move: "🚚",      // Move/rename repository (truck)
	
	// Extended types from gitmoji
	secrets: "🔐",   // Add or update secrets
	warnings: "🚨",  // Fix compiler / linter warnings
	pin: "📌",       // Pin dependencies to specific versions
	config: "🔧",    // Add or update configuration files
	i18n: "🌐",      // Internationalization and localization
	typos: "✏️",     // Fix typos
	comments: "💡",  // Add or update comments in source code
	drunk: "🍻",     // Write code drunkenly
	database: "🗃️",  // Perform database related changes
	logs_add: "🔊",  // Add or update logs
	logs_remove: "🔇", // Remove logs
	contributors: "👥", // Add or update contributor(s)
	ux: "🚸",        // Improve user experience / usability
	architecture: "🏗️", // Make architectural changes
	responsive: "📱", // Work on responsive design
	mock: "🤡",      // Mock things
	easter_egg: "🥚", // Add or update an easter egg
	gitignore: "🙈", // Add or update a .gitignore file
	snapshots: "📸", // Add or update snapshots
	experiments: "⚗️", // Perform experiments
	seo: "🔍️",      // Improve SEO
	types: "🏷️",     // Add or update types
	seed: "🌱",      // Add or update seed files
	flags: "🚩",     // Add, update, or remove feature flags
	error_handling: "🥅", // Catch errors
	animations: "💫", // Add or update animations and transitions
	deprecate: "🗑️", // Deprecate code that needs to be cleaned up
	auth: "🛂",      // Work on code related to authorization, roles and permissions
	bandage: "🩹",   // Simple fix for a non-critical issue
	explore: "🧐",   // Data exploration/inspection
	dead_code: "⚰️", // Remove dead code
	failing_test: "🧪", // Add a failing test
	business: "👔",  // Add or update business logic
	healthcheck: "🩺", // Add or update healthcheck
	infrastructure: "🧱", // Infrastructure related changes
	dx: "🧑‍💻",     // Improve developer experience
	sponsors: "💸",  // Add sponsorships or money related infrastructure
	threading: "🧵", // Add or update code related to multithreading or concurrency
	validation: "🦺", // Add or update code related to validation
	offline: "✈️",   // Improve offline support
};

