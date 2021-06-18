import * as winston from 'winston';
import * as context from 'express-http-context';
import config from './config';

export class Logger {
    private static instance: Logger;
    private readonly logger: winston.Logger;

    constructor() {
        const level = config.logger.level;
        const consoleConfig = {
            level,
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(info => `[${info.level}]: ${info.message}`)
            )
        };
        const transports: any[] = [new winston.transports.Console(consoleConfig)];

        if (config.logger.file.use) {
            const fileConfig: winston.transports.FileTransportOptions = {
                level,
                filename: config.logger.file.path,
                maxsize: config.logger.file.maxSize,
                format: winston.format.combine(
                    winston.format.timestamp({
                        format: config.logger.timeFormat
                    }),
                    winston.format.printf(info => `[${info.timestamp}] [${info.level}]: ${info.message}`)
                )
            };

            transports.push(new winston.transports.File(fileConfig));
        }

        this.logger = winston.createLogger({
            level,
            transports,
            defaultMeta: { component: 'bulk-runner' }
        });

        console.info = (message: any, params?: any) => this.info(message);
        console.log = (message: any, params?: any) => this.debug(message);
        console.warn = (message: any, params?: any) => this.warn(message);
        console.error = (message: string, trace?: any, context?: string) => this.error(message, trace, context);
    }

    public static getInstance(): Logger {
        if (!Logger.instance) Logger.instance = new Logger();

        return Logger.instance;
    }

    log(message: string) {
        this.logger.log(this.logger.level, this.formatMessage(message));
    }

    info(message: string) {
        this.logger.info(this.formatMessage(message));
    }

    debug(message: string) {
        this.logger.debug(this.formatMessage(message));
    }

    error(message: string, trace?: any, context?: string) {
        this.logger.error(this.formatMessage(message), trace, context);
    }

    warn(message: string) {
        this.logger.warn(this.formatMessage(message));
    }

    verbose(message: string) {
        this.logger.verbose(this.formatMessage(message));
    }

    formatMessage(message: string | undefined) {
        let request_id = context.get('request_id') ? `[${context.get('request_id')}] ` : '';
        return `${request_id}${message}`;
    }
}

export const logger = Logger.getInstance();
