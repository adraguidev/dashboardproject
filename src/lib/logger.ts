// Logger util
const LEVELS = ['debug', 'info', 'warn', 'error'] as const
export type LogLevel = typeof LEVELS[number]

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

function shouldLog(level: LogLevel) {
  const currIndex = LEVELS.indexOf(currentLevel)
  const lvlIndex = LEVELS.indexOf(level)
  return lvlIndex >= currIndex
}

export function logDebug(...args: unknown[]) {
  if (shouldLog('debug')) console.log(...args)
}

export function logInfo(...args: unknown[]) {
  if (shouldLog('info')) console.info(...args)
}

export function logWarn(...args: unknown[]) {
  if (shouldLog('warn')) console.warn(...args)
}

export function logError(...args: unknown[]) {
  if (shouldLog('error')) console.error(...args)
} 