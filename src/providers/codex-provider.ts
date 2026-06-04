import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { config } from '../config.js';
import { sessionManager } from '../claude/session-manager.js';
import { userPreferences } from './user-preferences.js';
import { BoundedMap } from '../utils/bounded-map.js';
import { parseSessionKey } from '../utils/session-key.js';
import type { Provider, AgentOptions, LoopOptions, AgentResponse, AgentUsage, ModelInfo } from './types.js';

const CODEX_MODELS: ModelInfo[] = [
  {
    id: 'gpt-5.5',
    label: 'GPT-5.5',
    description: 'Default ChatGPT-backed Codex CLI model',
  },
  {
    id: 'gpt-5.4',
    label: 'GPT-5.4',
    description: 'Strong professional work model',
  },
  {
    id: 'gpt-5.1',
    label: 'GPT-5.1',
    description: 'General coding and agentic tasks',
  },
  {
    id: 'gpt-5.3-codex',
    label: 'GPT-5.3 Codex',
    description: 'Codex model for eligible accounts/API auth',
  },
  {
    id: 'gpt-5.2-codex',
    label: 'GPT-5.2 Codex',
    description: 'Codex model for eligible accounts/API auth',
  },
  {
    id: 'gpt-5.1-codex-max',
    label: 'GPT-5.1 Codex Max',
    description: 'Codex model for eligible accounts/API auth',
  },
  {
    id: 'gpt-5.1-codex',
    label: 'GPT-5.1 Codex',
    description: 'Codex model for eligible accounts/API auth',
  },
  {
    id: 'gpt-5.1-codex-mini',
    label: 'GPT-5.1 Codex mini',
    description: 'Codex model for eligible accounts/API auth',
  },
];

const chatModels = new Map<number, string>();
const chatUsageCache = new BoundedMap<number, AgentUsage>(1000);

function getPersistedModel(chatId: number): string | undefined {
  return userPreferences.getModel(chatId);
}

function setPersistedModel(chatId: number, model: string): void {
  userPreferences.setModel(chatId, model);
}

function clearPersistedModel(chatId: number): void {
  userPreferences.clearModel(chatId);
}

function getConfiguredModel(chatId: number): string {
  let model = chatModels.get(chatId);
  if (!model) {
    model = getPersistedModel(chatId);
    if (model) {
      chatModels.set(chatId, model);
    }
  }
  return model || config.CODEX_DEFAULT_MODEL;
}

function writeImageAttachments(images: AgentOptions['images'], dir: string): string[] {
  if (!images || images.length === 0) return [];

  return images.map((image, index) => {
    const ext = image.mediaType.includes('png')
      ? '.png'
      : image.mediaType.includes('webp')
        ? '.webp'
        : '.jpg';
    const filePath = path.join(dir, `image-${index + 1}${ext}`);
    fs.writeFileSync(filePath, Buffer.from(image.data, 'base64'), { mode: 0o600 });
    return filePath;
  });
}

function cleanupDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best-effort temp cleanup.
  }
}

function buildCodexArgs(model: string, cwd: string, outputPath: string, imagePaths: string[]): string[] {
  const args = [
    'exec',
    '--model', model,
    '--cd', cwd,
    '--skip-git-repo-check',
    '--output-last-message', outputPath,
  ];

  if (config.CODEX_EPHEMERAL) {
    args.push('--ephemeral');
  }

  if (config.DANGEROUS_MODE || config.CODEX_SANDBOX === 'danger-full-access') {
    args.push('--dangerously-bypass-approvals-and-sandbox');
  } else {
    args.push('--sandbox', config.CODEX_SANDBOX);
  }

  for (const imagePath of imagePaths) {
    args.push('--image', imagePath);
  }

  args.push('-');
  return args;
}

async function runCodexExec(
  sessionKey: string,
  message: string,
  options?: AgentOptions,
): Promise<AgentResponse> {
  const chatId = parseSessionKey(sessionKey).chatId;
  const session = sessionManager.getSession(sessionKey);
  if (!session) {
    throw new Error('No active session. Use /project to set working directory.');
  }

  sessionManager.updateActivity(sessionKey, message);
  const model = options?.model || getConfiguredModel(chatId);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claudegram-codex-'));
  const outputPath = path.join(tmpDir, 'last-message.txt');
  const imagePaths = writeImageAttachments(options?.images, tmpDir);
  const args = buildCodexArgs(model, session.workingDirectory, outputPath, imagePaths);
  const startedAt = Date.now();

  options?.onProgress?.(`Running Codex CLI with ${model}...`);

  return new Promise<AgentResponse>((resolve, reject) => {
    const child = spawn(config.CODEX_EXECUTABLE_PATH, args, {
      cwd: session.workingDirectory,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    let timeout: NodeJS.Timeout | undefined;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      cleanupDir(tmpDir);
      fn();
    };

    const abort = () => {
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL');
      }, 2000).unref();
    };

    if (options?.abortController?.signal.aborted) {
      abort();
      finish(() => resolve({ text: 'Request cancelled.', toolsUsed: [] }));
      return;
    }

    options?.abortController?.signal.addEventListener('abort', abort, { once: true });

    if (config.CODEX_TIMEOUT_MS > 0) {
      timeout = setTimeout(() => {
        abort();
        finish(() => reject(new Error(`Codex CLI timed out after ${config.CODEX_TIMEOUT_MS}ms`)));
      }, config.CODEX_TIMEOUT_MS);
    }

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      finish(() => reject(new Error(`Failed to start Codex CLI: ${err.message}`)));
    });

    child.on('close', (code) => {
      if (settled) return;

      if (options?.abortController?.signal.aborted) {
        finish(() => resolve({ text: 'Request cancelled.', toolsUsed: [] }));
        return;
      }

      let text = '';
      if (fs.existsSync(outputPath)) {
        text = fs.readFileSync(outputPath, 'utf-8').trim();
      }
      if (!text) {
        text = stdout.trim();
      }

      if (code !== 0) {
        const detail = (stderr || stdout || `exit code ${code}`).trim();
        finish(() => reject(new Error(`Codex CLI failed: ${detail}`)));
        return;
      }

      const usage: AgentUsage = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCostUsd: 0,
        contextWindow: 0,
        numTurns: 1,
        model,
      };
      chatUsageCache.set(chatId, usage);

      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      finish(() => resolve({
        text: text || 'No response from Codex CLI.',
        toolsUsed: [`codex exec (${elapsed}s)`],
        usage,
      }));
    });

    child.stdin.end(message);
  });
}

export const codexProvider: Provider = {
  name: 'codex',

  sendToAgent(sessionKey: string, message: string, options?: AgentOptions): Promise<AgentResponse> {
    return runCodexExec(sessionKey, message, options);
  },

  sendLoopToAgent(sessionKey: string, message: string, options?: LoopOptions): Promise<AgentResponse> {
    return runCodexExec(sessionKey, message, options);
  },

  clearConversation(sessionKey: string): void {
    const chatId = parseSessionKey(sessionKey).chatId;
    chatUsageCache.delete(chatId);
  },

  setModel(chatId: number, model: string): void {
    chatModels.set(chatId, model);
    setPersistedModel(chatId, model);
  },

  getModel(chatId: number): string {
    return getConfiguredModel(chatId);
  },

  clearModel(chatId: number): void {
    chatModels.delete(chatId);
    clearPersistedModel(chatId);
  },

  getCachedUsage(sessionKey: string): AgentUsage | undefined {
    const chatId = parseSessionKey(sessionKey).chatId;
    return chatUsageCache.get(chatId);
  },

  isDangerousMode(): boolean {
    return config.DANGEROUS_MODE || config.CODEX_SANDBOX === 'danger-full-access';
  },

  async getAvailableModels(): Promise<ModelInfo[]> {
    const configuredDefault = config.CODEX_DEFAULT_MODEL;
    if (CODEX_MODELS.some((model) => model.id === configuredDefault)) {
      return CODEX_MODELS;
    }

    return [
      {
        id: configuredDefault,
        label: configuredDefault,
        description: 'Configured default Codex model',
      },
      ...CODEX_MODELS,
    ];
  },
};
