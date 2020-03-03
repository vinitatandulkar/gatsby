import Chalk from "chalk"

export interface ActivityTracker {
  start(): Function,
  end(): Function,
  setStatus(status: string): Function,
  span: Object,
}

export type ActivityArgs = {
  parentSpan?: Object,
}

type LogMessageType = (format: string, ...args: Array<any>) => void

export interface Reporter {
  stripIndent: Function;
  format: typeof Chalk;
  setVerbose(isVerbose: boolean): void;
  setNoColor(isNoColor: boolean): void;
  panic(errorMeta: unknown, error?: unknown): void;
  panicOnBuild(errorMeta: unknown, error?: unknown): void;
  error(errorMeta: unknown, error?: unknown): void;
  uptime(prefix: string): void;
  success: LogMessageType;
  verbose: LogMessageType;
  info: LogMessageType;
  warn: LogMessageType;
  log: LogMessageType;
  activityTimer(name: string, activityArgs: ActivityArgs): ActivityTracker;
}
