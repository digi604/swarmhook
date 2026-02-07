import { Axiom } from '@axiomhq/js'

const axiom = process.env.AXIOM_TOKEN
  ? new Axiom({ token: process.env.AXIOM_TOKEN })
  : null

const dataset = process.env.AXIOM_DATASET || 'swarmhook'

export interface LogData {
  timestamp?: string
  level: 'info' | 'warn' | 'error' | 'security'
  message?: string
  [key: string]: any
}

/**
 * Log to both console and Axiom
 */
export async function log(data: LogData) {
  // Add timestamp if not present
  if (!data.timestamp) {
    data.timestamp = new Date().toISOString()
  }

  // Always log to console
  console.log(JSON.stringify(data))

  // Also send to Axiom if configured
  if (axiom) {
    try {
      await axiom.ingest(dataset, [data])
    } catch (error) {
      // Don't fail if Axiom is down, just log locally
      console.error('Failed to send log to Axiom:', error)
    }
  }
}

/**
 * Flush logs to Axiom (call before shutdown)
 */
export async function flushLogs() {
  if (axiom) {
    try {
      await axiom.flush()
    } catch (error) {
      console.error('Failed to flush logs to Axiom:', error)
    }
  }
}

/**
 * Convenience functions
 */
export const logger = {
  info: (message: string, data?: any) => log({ level: 'info', message, ...data }),
  warn: (message: string, data?: any) => log({ level: 'warn', message, ...data }),
  error: (message: string, data?: any) => log({ level: 'error', message, ...data }),
  security: (message: string, data?: any) => log({ level: 'security', message, ...data }),
}
