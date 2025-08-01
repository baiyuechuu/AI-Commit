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
	deepseek: {
		name: "DeepSeek",
		baseUrl: "https://api.deepseek.com/v1",
		keyEnv: "DEEPSEEK_API_KEY",
		endpoint: "chat/completions",
		models: ["deepseek-chat", "deepseek-reasoner"],
	},
};