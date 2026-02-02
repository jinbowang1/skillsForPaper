import { mkdirSync } from "fs";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { LOGS_DIR } from "./paths.js";

mkdirSync(LOGS_DIR, { recursive: true });

const transport = new DailyRotateFile({
  dirname: LOGS_DIR,
  filename: "app_%DATE%.log",
  datePattern: "YYYYMMDD",
  maxFiles: "30d",
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(
      ({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`
    )
  ),
});

export const logger = winston.createLogger({
  transports: [
    transport,
    new winston.transports.Console({
      level: "warn",
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});
