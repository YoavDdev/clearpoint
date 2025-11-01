import { createClient } from "@supabase/supabase-js";

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let cachedLogLevel: LogLevel = 'warn'; // Default to warn for low resource mode
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // Cache for 5 minutes

async function getLogLevel(): Promise<LogLevel> {
  // Return cached level if still fresh
  if (Date.now() - lastFetch < CACHE_DURATION) {
    return cachedLogLevel;
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'log_level')
      .single();

    if (data?.setting_value) {
      cachedLogLevel = data.setting_value as LogLevel;
      lastFetch = Date.now();
    }
  } catch (error) {
    // If we can't fetch, use cached or default
    console.error('Failed to fetch log level:', error);
  }

  return cachedLogLevel;
}

function shouldLog(messageLevel: LogLevel, currentLevel: LogLevel): boolean {
  return LOG_LEVELS[messageLevel] >= LOG_LEVELS[currentLevel];
}

export const logger = {
  async debug(message: string, ...args: any[]) {
    const level = await getLogLevel();
    if (shouldLog('debug', level)) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  async info(message: string, ...args: any[]) {
    const level = await getLogLevel();
    if (shouldLog('info', level)) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  async warn(message: string, ...args: any[]) {
    const level = await getLogLevel();
    if (shouldLog('warn', level)) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  async error(message: string, ...args: any[]) {
    const level = await getLogLevel();
    if (shouldLog('error', level)) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },

  // Synchronous versions for when async is not possible
  debugSync(message: string, ...args: any[]) {
    if (shouldLog('debug', cachedLogLevel)) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  infoSync(message: string, ...args: any[]) {
    if (shouldLog('info', cachedLogLevel)) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  warnSync(message: string, ...args: any[]) {
    if (shouldLog('warn', cachedLogLevel)) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  errorSync(message: string, ...args: any[]) {
    if (shouldLog('error', cachedLogLevel)) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
};

// Export a function to manually update cache (useful for testing)
export function setLogLevel(level: LogLevel) {
  cachedLogLevel = level;
  lastFetch = Date.now();
}
