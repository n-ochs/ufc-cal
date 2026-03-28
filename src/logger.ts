import { inspect } from "node:util";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFormat = "pretty" | "json";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export type LogFields = Record<string, unknown>;

function normalizeError(err: unknown): LogFields {
  if (err instanceof Error) {
    const out: LogFields = {
      errorName: err.name,
      errorMessage: err.message,
    };
    if (err.stack) out.stack = err.stack;
    const cause = "cause" in err ? (err as Error & { cause?: unknown }).cause : undefined;
    if (cause !== undefined) {
      out.errorCause =
        cause instanceof Error
          ? {
              name: cause.name,
              message: cause.message,
              ...(cause.stack ? { stack: cause.stack } : {}),
            }
          : cause;
    }
    return out;
  }
  if (typeof err === "object" && err !== null) {
    try {
      return { error: JSON.stringify(err) };
    } catch {
      return { error: Object.prototype.toString.call(err) };
    }
  }
  return { error: err };
}

function resolveFormat(): LogFormat {
  const v = process.env.LOG_FORMAT?.toLowerCase();
  if (v === "json") return "json";
  return "pretty";
}

function useInspectColors(): boolean {
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.FORCE_COLOR === "0") return false;
  if (process.env.FORCE_COLOR !== undefined && process.env.FORCE_COLOR !== "") return true;
  return process.stdout.isTTY === true;
}

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

const LEVEL_PREFIX: Record<LogLevel, string> = {
  debug: `\x1b[90m${BOLD}`,
  info: `\x1b[36m${BOLD}`,
  warn: `\x1b[33m${BOLD}`,
  error: `\x1b[31m${BOLD}`,
};

function formatPrettyLine(record: LogFields, level: LogLevel): string {
  const colors = useInspectColors();
  const ts = String(record.ts ?? "");
  const msg = String(record.msg ?? "");
  const ns = record.ns != null ? String(record.ns) : "";
  const rest: LogFields = { ...record };
  delete rest.ts;
  delete rest.level;
  delete rest.msg;
  delete rest.ns;

  const c = (s: string) => (colors ? s : "");
  const levelWord = level.toUpperCase().padEnd(5);
  const levelStyled = `${c(LEVEL_PREFIX[level])}${levelWord}${c(RESET)}`;

  let line = `${c(DIM)}${ts}${c(RESET)} ${levelStyled}`;
  if (ns) line += ` ${c(DIM)}${ns}${c(RESET)}`;
  line += ` ${msg}`;

  const extraKeys = Object.keys(rest);
  if (extraKeys.length === 0) return line;

  const detail = inspect(rest, {
    colors,
    depth: 12,
    compact: false,
    breakLength: 96,
  });
  const indent = colors ? `${c(DIM)}│${c(RESET)} ` : "│ ";
  return `${line}\n${indent}${detail.split("\n").join(`\n${indent}`)}`;
}

function formatLine(record: LogFields, level: LogLevel, format: LogFormat): string {
  if (format === "json") return JSON.stringify(record);
  return formatPrettyLine(record, level);
}

export class Logger {
  constructor(
    private readonly namespace?: string,
    private readonly minLevel: LogLevel = "debug",
    private readonly format: LogFormat = resolveFormat()
  ) {}

  child(name: string): Logger {
    const ns = this.namespace ? `${this.namespace}:${name}` : name;
    return new Logger(ns, this.minLevel, this.format);
  }

  private enabled(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[this.minLevel];
  }

  private emit(level: LogLevel, msg: string, fields?: LogFields): void {
    if (!this.enabled(level)) return;

    const record: LogFields = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...(this.namespace ? { ns: this.namespace } : {}),
      ...fields,
    };

    const line = formatLine(record, level, this.format);

    switch (level) {
      case "debug":
        console.debug(line);
        break;
      case "info":
        console.info(line);
        break;
      case "warn":
        console.warn(line);
        break;
      case "error":
        console.error(line);
        break;
    }
  }

  debug(msg: string, fields?: LogFields): void {
    this.emit("debug", msg, fields);
  }

  info(msg: string, fields?: LogFields): void {
    this.emit("info", msg, fields);
  }

  warn(msg: string, fields?: LogFields): void {
    this.emit("warn", msg, fields);
  }

  /**
   * Log at error level. Pass `err` to attach normalized name, message, stack, and cause.
   */
  error(msg: string, err?: unknown, fields?: LogFields): void {
    const errFields = err !== undefined ? normalizeError(err) : {};
    this.emit("error", msg, { ...errFields, ...fields });
  }
}

/** Root logger (no namespace). Use `new Logger("my-module")` or `log.child("x")` for scope. */
export const log = new Logger();
