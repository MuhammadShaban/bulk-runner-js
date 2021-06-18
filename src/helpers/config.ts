import { resolve } from 'path';
import dotenv from 'dotenv';
import { IResultst } from './model';

const rootPath = global.__rootPath;
dotenv.config({
    path: `${rootPath}/.env`,
    debug: !!JSON.parse(process.env.DEBUG || 'false')
});

const config = {
    port: parseInt(process.env.PORT || '4000', 10),
    rootPath,
    uploadPath: process.env.UPLOAD_PATH || resolve(rootPath, './temp/batch'),
    results: {
        driver: process.env.RESULTS_DRIVER || 'local',
        tempPath: process.env.RESULTS_TEMP_PATH || resolve(rootPath, `./temp/results`).toString(),
        savePath: process.env.RESULTS_SAVE_PATH
    } as IResultst,
    runner: {
        throughput: parseInt(process.env.RUNNER_THROUGHPUT || '100', 10),
        request: {
            retries: {
                count: parseInt(process.env.REQUEST_RETRIES_COUNT || '0', 10),
                delay: parseInt(process.env.REQUEST_RETRIES_DELAY || '1000', 10)
            },
            timeout: parseInt(process.env.REQUEST_TIMEOUT || '5000', 10)
        }
    },
    logger: {
        level: process.env.LOG_LEVEL || 'debug',
        timeFormat: process.env.LOG_TIME_FORMAT || 'YYYY-MM-DDTHH:mm:ss.SSS',
        file: {
            use: !!JSON.parse(process.env.LOG_TO_FILE?.toLowerCase() || 'true'),
            path: process.env.LOG_FILE_PATH || resolve(rootPath, './logs/bulk-runner.log'),
            maxSize: Number(process.env.LOG_FILE_MAXSIZE || '10') * 1024 * 1024 // Convert mega to bytes
        }
    }
};

export default config;
