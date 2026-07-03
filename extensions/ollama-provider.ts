import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const DEFAULT_OLLAMA_BASE_URL = "http://host.docker.internal:11434";
const DEFAULT_OLLAMA_MODEL = "gemma4:26b-64k";

type OllamaTag = {
	name?: string;
	model?: string;
};

function env(name: string, fallback = ""): string {
	const value = process.env[name];
	return value && value.trim() ? value.trim() : fallback;
}

function openAIBaseUrl(baseUrl: string): string {
	const normalized = baseUrl.replace(/\/+$/, "");
	return normalized.endsWith("/v1") ? normalized : `${normalized}/v1`;
}

function contextWindowFor(model: string): number {
	const lowered = model.toLowerCase();
	const match = lowered.match(/(\d+)k/);
	if (match) return Number(match[1]) * 1000;
	return Number(env("OLLAMA_CONTEXT_WINDOW", "128000"));
}

function configuredModels(): string[] {
	const configured = env("OLLAMA_MODELS", env("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL));
	return configured
		.split(",")
		.map((model) => model.trim())
		.filter(Boolean);
}

async function installedModels(baseUrl: string): Promise<string[]> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), Number(env("OLLAMA_DISCOVERY_TIMEOUT_MS", "1500")));

	try {
		const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/tags`, {
			signal: controller.signal,
		});
		if (!response.ok) return [];

		const payload = (await response.json()) as { models?: OllamaTag[] };
		return (payload.models ?? [])
			.map((model) => model.name ?? model.model ?? "")
			.filter(Boolean);
	} catch {
		return [];
	} finally {
		clearTimeout(timeout);
	}
}

export default async function (pi: ExtensionAPI) {
	if (env("PI_OLLAMA_ENABLED", "1") === "0") return;

	const baseUrl = env("OLLAMA_BASE_URL", DEFAULT_OLLAMA_BASE_URL);
	const discovered = await installedModels(baseUrl);
	const preferred = configuredModels();
	const modelIds = [...new Set([...preferred, ...discovered])];
	const maxTokens = Number(env("OLLAMA_MAX_TOKENS", "4096"));

	pi.registerProvider("ollama", {
		name: "Ollama",
		baseUrl: openAIBaseUrl(baseUrl),
		api: "openai-completions",
		apiKey: env("OLLAMA_API_KEY", "ollama"),
		models: modelIds.map((id) => ({
			id,
			name: `${id} (Ollama)`,
			reasoning: false,
			input: ["text"],
			contextWindow: contextWindowFor(id),
			maxTokens,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			compat: {
				supportsDeveloperRole: false,
				supportsReasoningEffort: false,
			},
		})),
	});

	console.log(`[ollama-provider] registered ${modelIds.length} model(s) from ${baseUrl}`);
}
