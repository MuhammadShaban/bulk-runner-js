global.__rootPath = __dirname;

import express from 'express';
import * as context from 'express-http-context';
import { v4 as uuid } from 'uuid';

import config from './helpers/config';
import { logger } from './helpers/logger';
import { createTempPaths, getCountryTime, getRemoteAddress } from './helpers/utils';
import Controller from './controller';
import { Multer } from './helpers/multer';

const bootstrap = async () => {
    const app: express.Express = express();
    const multer = Multer();
    await createTempPaths(config.uploadPath, config.results.tempPath);

    app.disable('x-powered-by');
    app.get('/ping', (req: express.Request, res: express.Response) => res.status(200).send('pong'));

    app.use(context.middleware);
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
        const remoteAddress = getRemoteAddress((req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string);
        context.set('request_id', uuid());
        context.set('request_time', getCountryTime(2));
        context.set('remote_ddress', remoteAddress);

        console.log(`[${req.method} ${req.originalUrl}] Received new request from [ADDRESS:${remoteAddress}]`);

        next();
    });

    app.post('/send', multer.single('batch_file'), Controller.index);

    app.use((req: express.Request, res: express.Response) => res.status(404).send());

    app.listen(config.port, '0.0.0.0', () => {
        logger.info(`Server listening on http://localhost:${config.port}`);
    });

    return app;
};

bootstrap().catch(err => logger.error(err));

process.on('SIGTERM', () => {
    console.warn('PROCESS RECEIVED [SIGTERM]');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.warn('PROCESS RECEIVED [SIGINT]');
    process.exit(0);
});

process.once('SIGUSR2', () => {
    process.kill(process.pid, 'SIGUSR2');
});

process.on('uncaughtException', ex => {
    console.error(`PROCESS UNCAUGHT EXCEPTION : ${ex?.stack || ex?.message || ex}`);
});

process.on('unhandledRejection', ex => {
    console.error(`PROCESS UNCAUGHT PROMISE EXCEPTION : ${ex}`);
});

process.on('UnhandledPromiseRejection', ex => {
    console.error(`PROCESS UNCAUGHT PROMISE EXCEPTION : ${ex}`);
});

process.on('UnhandledPromiseRejectionWarning', ex => {
    console.error(`PROCESS UNCAUGHT PROMISE EXCEPTION : ${ex}`);
});
