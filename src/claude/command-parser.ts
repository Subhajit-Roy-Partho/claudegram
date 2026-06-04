import { config } from '../config.js';

export interface ParsedCommand {
  command: string | null;
  args: string;
  model: string | null;
}

const CLAUDE_COMMANDS = ['plan', 'explore', 'model', 'commands', 'loop', 'resume', 'continue', 'sessions', 'provider'] as const;
type ClaudeCommand = (typeof CLAUDE_COMMANDS)[number];

export interface TelegramCommand {
  command: string;
  description: string;
}

type CommandSection =
  | 'Getting Started'
  | 'Agent Commands'
  | 'Session Commands'
  | 'Content Commands'
  | 'Media Commands'
  | 'Settings Commands'
  | 'Utility Commands';

interface CommandDefinition {
  command: string;
  description: string;
  help: string;
  section: CommandSection;
  enabled?: () => boolean;
}

const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    command: 'start',
    description: 'Show help and getting started',
    help: 'Show help and getting started',
    section: 'Getting Started',
  },
  {
    command: 'commands',
    description: 'List all available commands',
    help: 'Show this full command list',
    section: 'Getting Started',
  },
  {
    command: 'project',
    description: 'Set working directory',
    help: 'Set working directory with the browser or a path',
    section: 'Session Commands',
  },
  {
    command: 'newproject',
    description: 'Create a new project',
    help: 'Create a new project under the workspace root',
    section: 'Session Commands',
  },
  {
    command: 'status',
    description: 'Show current session status',
    help: 'Show project, provider, model, session, and usage details',
    section: 'Session Commands',
  },
  {
    command: 'clear',
    description: 'Clear conversation history',
    help: 'Clear conversation history for the current session',
    section: 'Session Commands',
  },
  {
    command: 'resume',
    description: 'Resume a saved session',
    help: 'Pick from recent sessions and resume one',
    section: 'Session Commands',
  },
  {
    command: 'continue',
    description: 'Continue last session',
    help: 'Resume the most recent saved session',
    section: 'Session Commands',
  },
  {
    command: 'sessions',
    description: 'View saved sessions',
    help: 'List saved sessions for the current chat',
    section: 'Session Commands',
  },
  {
    command: 'teleport',
    description: 'Move session to terminal',
    help: 'Show the terminal command for continuing the session locally',
    section: 'Session Commands',
  },
  {
    command: 'plan',
    description: 'Start planning mode',
    help: 'Ask the agent to plan a complex task before execution',
    section: 'Agent Commands',
  },
  {
    command: 'explore',
    description: 'Explore codebase',
    help: 'Ask the agent to inspect the codebase for a question',
    section: 'Agent Commands',
  },
  {
    command: 'loop',
    description: 'Run in loop mode',
    help: 'Run iteratively until the task is complete or max iterations is reached',
    section: 'Agent Commands',
  },
  {
    command: 'model',
    description: 'Switch AI model',
    help: 'Show or set the active model for the current provider',
    section: 'Agent Commands',
  },
  {
    command: 'provider',
    description: 'Switch AI provider',
    help: 'Switch provider between Claude and OpenCode',
    section: 'Agent Commands',
    enabled: () => config.OPENCODE_ENABLED,
  },
  {
    command: 'reddit',
    description: 'Fetch Reddit posts and subreddits',
    help: 'Fetch Reddit posts, subreddits, comments, or user profiles',
    section: 'Content Commands',
    enabled: () => config.REDDIT_ENABLED,
  },
  {
    command: 'vreddit',
    description: 'Download Reddit video',
    help: 'Download Reddit-hosted video from a post URL',
    section: 'Content Commands',
    enabled: () => config.VREDDIT_ENABLED,
  },
  {
    command: 'medium',
    description: 'Fetch Medium articles',
    help: 'Fetch a Medium article through the configured Freedium mirror',
    section: 'Content Commands',
    enabled: () => config.MEDIUM_ENABLED,
  },
  {
    command: 'file',
    description: 'Download a project file',
    help: 'Download a file from the active project',
    section: 'Content Commands',
  },
  {
    command: 'telegraph',
    description: 'View markdown with Instant View',
    help: 'Toggle Telegraph Instant View or publish markdown as an article',
    section: 'Content Commands',
  },
  {
    command: 'extract',
    description: 'Extract text, audio, or video from URL',
    help: 'Extract transcript, audio, video, or all outputs from YouTube, TikTok, or Instagram',
    section: 'Media Commands',
    enabled: () => config.EXTRACT_ENABLED,
  },
  {
    command: 'transcribe',
    description: 'Transcribe audio to text',
    help: 'Transcribe a voice note, audio message, or uploaded audio file',
    section: 'Media Commands',
    enabled: () => config.TRANSCRIBE_ENABLED,
  },
  {
    command: 'mode',
    description: 'Toggle streaming mode',
    help: 'Toggle streaming responses versus wait-for-completion responses',
    section: 'Settings Commands',
  },
  {
    command: 'terminalui',
    description: 'Toggle terminal-style display',
    help: 'Toggle the terminal-style progress display',
    section: 'Settings Commands',
  },
  {
    command: 'tts',
    description: 'Toggle voice replies',
    help: 'Toggle voice replies, autoplay, and voice selection',
    section: 'Settings Commands',
  },
  {
    command: 'context',
    description: 'Show context usage',
    help: 'Show Claude context and token usage for the current session',
    section: 'Utility Commands',
  },
  {
    command: 'botstatus',
    description: 'Show bot process status',
    help: 'Show bot process status and uptime',
    section: 'Utility Commands',
  },
  {
    command: 'restartbot',
    description: 'Restart the bot',
    help: 'Restart the bot process through the control script',
    section: 'Utility Commands',
  },
  {
    command: 'cancel',
    description: 'Cancel current request',
    help: 'Cancel the current in-flight request immediately',
    section: 'Utility Commands',
  },
  {
    command: 'softreset',
    description: 'Cancel and clear current session',
    help: 'Cancel the current request, clear the queue, and clear session history',
    section: 'Utility Commands',
  },
  {
    command: 'ping',
    description: 'Check if bot is responsive',
    help: 'Check whether the bot process can answer immediately',
    section: 'Utility Commands',
  },
];

function isCommandEnabled(definition: CommandDefinition): boolean {
  return definition.enabled ? definition.enabled() : true;
}

function escapeMarkdownV2Literal(value: string): string {
  return value.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

export function getTelegramCommandList(): TelegramCommand[] {
  return COMMAND_DEFINITIONS
    .filter(isCommandEnabled)
    .map(({ command, description }) => ({ command, description }));
}

export function getHiddenTelegramCommandNames(): string[] {
  return COMMAND_DEFINITIONS
    .filter((definition) => !isCommandEnabled(definition))
    .map((definition) => definition.command);
}

export function getRecognizedBotCommandNames(): string[] {
  return COMMAND_DEFINITIONS.map((definition) => definition.command);
}

export function parseClaudeCommand(message: string): ParsedCommand {
  const trimmed = message.trim();

  // Check if message starts with a slash command
  if (!trimmed.startsWith('/')) {
    return { command: null, args: trimmed, model: null };
  }

  const firstSpace = trimmed.indexOf(' ');
  const commandPart = firstSpace === -1 ? trimmed.slice(1) : trimmed.slice(1, firstSpace);
  const commandName = commandPart.split('@')[0] || commandPart;
  const args = firstSpace === -1 ? '' : trimmed.slice(firstSpace + 1).trim();

  // Check if it's a Claude command
  if (CLAUDE_COMMANDS.includes(commandName as ClaudeCommand)) {
    return { command: commandName, args, model: null };
  }

  // Not a recognized Claude command - return as regular message
  return { command: null, args: trimmed, model: null };
}

export function isClaudeCommand(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed.startsWith('/')) return false;

  const firstSpace = trimmed.indexOf(' ');
  const commandPart = firstSpace === -1 ? trimmed.slice(1) : trimmed.slice(1, firstSpace);
  const commandName = commandPart.split('@')[0] || commandPart;

  return getRecognizedBotCommandNames().includes(commandName);
}

// Returns MarkdownV2 escaped command list
export function getAvailableCommands(): string {
  const sectionOrder: CommandSection[] = [
    'Getting Started',
    'Agent Commands',
    'Session Commands',
    'Content Commands',
    'Media Commands',
    'Settings Commands',
    'Utility Commands',
  ];

  const sections = sectionOrder
    .map((title) => ({
      title,
      commands: COMMAND_DEFINITIONS
        .filter((definition) => definition.section === title && isCommandEnabled(definition))
        .map((definition) => {
          const help = escapeMarkdownV2Literal(definition.help);
          return `• \`/${definition.command}\` \\- ${help}`;
        }),
    }))
    .filter((section) => section.commands.length > 0);

  const lines: string[] = [];
  for (const section of sections) {
    lines.push(`*${section.title}:*`, '', ...section.commands, '');
  }

  return lines.join('\n').trimEnd();
}
