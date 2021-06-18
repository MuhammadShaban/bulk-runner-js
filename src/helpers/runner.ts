import { createReadStream } from 'fs';
import { split, mapSync, MapStream } from 'event-stream';
import { EventEmitter } from 'events';
import Axios from 'axios-observable';

import { of, Subject, throwError } from 'rxjs';
import { takeUntil, retryWhen, delay, concatMap } from 'rxjs/operators';

import { logger } from './logger';
import config from './config';
import { cleanObject, convertIntoArray, convertIntoObject, getTimeDiff } from './utils';
import { IObject, IOptions } from './model';
import { CsvWriter } from './csv';
import { Monitor } from './monitor';
import { queue } from './queue';

export class Runner {
    progressCancel$: Subject<any> = new Subject();

    constructor(private data: IOptions, private requestId: string) { }

    start() {
        return new Promise((resolve, reject) => {
            queue.set(this.requestId, this.data);

            const csvWriter = new CsvWriter(this.requestId, config.results, this.data.results_map as string);
            csvWriter
                .on('info', message => logger.info(message))
                .on('debug', message => logger.debug(message))
                .on('success', message => logger.info(message))
                .on('error', error => logger.error(error));

            const runner = this.runner(this.data)
                .on('response', (error, order, data, results, request, time) => {
                    let _results = null;
                    if (error) {
                        logger.error(`[LINE_NUMBER:${order}] [RESPONSE_TIME: ${time}] Response error: ${error} - [REQUEST]: ${JSON.stringify(request)}`);
                    } else {
                        _results = results?.data;
                        logger.debug(`[LINE_NUMBER:${order}] [RESPONSE_TIME: ${time}] Response: [STATUS_CODE: ${results.status}] [RESPONSE: ${JSON.stringify(results.data)}] - [REQUEST: ${JSON.stringify(request)}]`);
                    }

                    csvWriter.append(order, data, _results, time, error);
                })
                .on('error', error => {
                    logger.error(error);
                    reject(error);
                })
                .on('end', message => {
                    runner.removeAllListeners();
                    csvWriter.removeAllListeners();
                    csvWriter.destroy();
                    logger.info(message);
                    resolve(message);
                });
        });
    }

    runner(options: IOptions): EventEmitter {
        const emitter = new EventEmitter();
        const monitor = new Monitor(this.requestId);

        try {
            options = this.prepareOptions(options);
            const retryOptions = config.runner.request.retries;
            const throughput = options.throughput || config.runner.throughput;

            let total = 0;
            let requestsCount = 0;
            let columns: string[];

            monitor.updateTotal(options.batch_size);

            const readStream: MapStream = createReadStream(options.batch_file)
                .pipe(split())
                .pipe(
                    mapSync((line: string) => {
                        if (!line) return;
                        if (!columns) {
                            columns = convertIntoArray(line);
                            emitter.emit('columns', columns);
                            readStream.pause();
                            setImmediate(() => readStream.resume());
                            return;
                        }

                        ++requestsCount;
                        if (requestsCount >= throughput) {
                            requestsCount = 0;
                            readStream.pause();
                        }

                        const order = ++total;
                        monitor.updateProgress({ inProgress: 1 });

                        const start = process.hrtime();
                        const request = this.prepareRequest(options, columns, line);
                        emitter.emit('request', request);

                        Axios.request(request)
                            .pipe(
                                takeUntil(this.progressCancel$),
                                retryWhen(err =>
                                    err.pipe(
                                        concatMap((error, index) => {
                                            if (index === retryOptions.count) return throwError(error);

                                            return of(error).pipe(delay(retryOptions.delay));
                                        })
                                    )
                                )
                            )
                            .subscribe(
                                res => {
                                    monitor.updateProgress({ inProgress: -1, done: 1, success: 1 });
                                    emitter.emit('response', null, order, line, res, request, getTimeDiff(start));
                                },
                                err => {
                                    monitor.updateProgress({ inProgress: -1, done: 1, faild: 1 });
                                    emitter.emit('response', err, order, line, null, request, getTimeDiff(start));
                                }
                            );
                    })
                )
                .on('error', error => {
                    emitter.emit('error', `Error while reading batch file: ${JSON.stringify(error)}`);
                })
                .on('end', () => {
                    monitor.updateTotal(total);
                });

            const interval = setInterval(() => {
                monitor.updateProgress();
                logger.info(monitor.toString());

                if (monitor.isDone()) {
                    emitter.emit('end', `Runner done: ${monitor.toString()}.`);

                    // TODO
                    // Implement how we will deal with the progress (queue, faild requests)
                    monitor.del();

                    this.cancel();
                    readStream.removeAllListeners();
                    return clearInterval(interval);
                }

                readStream.resume();
            }, 1000);
        } catch (error) {
            emitter.emit('error', `Error while reading the batch file: ${JSON.stringify(error)}`);
        }

        return emitter;
    }

    prepareOptions(options: IOptions): IOptions {
        const url = options.url;
        const method = options.method;
        const timeout = Number(options.timeout ?? config.runner.request.timeout);
        const data = convertIntoObject(options.data ?? '');
        const params = convertIntoObject(options.params ?? '');
        const headers = convertIntoObject(options.headers ?? '');
        const results_map = convertIntoObject(options.results_map ?? '');
        const batch_file = options.batch_file;
        const batch_size = Number(options.batch_size);
        const throughput = Number(options.throughput ?? config.runner.throughput);

        return { url, method, data, params, headers, timeout, results_map, batch_file, batch_size, throughput };
    }

    prepareRequest(options: IOptions, columns: string[], data: string) {
        const dataArr = convertIntoArray(data);

        const pathvariables = this.getPathVariables(options.url);
        options.data = options.data as IObject;
        options.params = options.params as IObject;
        options.headers = options.headers as IObject;

        for (let index = 0; index < columns.length; index++) {
            const column = columns[index];

            if (dataArr[index]) {
                if (column in options.data) options.data[`${column}`] = dataArr[index];
                if (column in options.params) options.params[`${column}`] = dataArr[index];
                if (column in options.headers) options.headers[`${column}`] = dataArr[index];
                if (pathvariables.includes(column)) options.url = options.url.replace(`:${column}`, dataArr[index]);
            }
        }

        const _data = cleanObject(options.data) as IObject;
        const _params = cleanObject(options.params) as IObject;
        const _headers = cleanObject(options.headers) as IObject;

        const request: any = {
            url: options.url,
            method: options.method,
            timeout: options.timeout
        };

        if (Object.keys(_data).length) request['data'] = _data;
        if (Object.keys(_params).length) request['params'] = _params;
        if (Object.keys(_headers).length) request['headers'] = _headers;

        return request;
    }

    getPathVariables(url: string): string[] {
        return url
            .split(':')
            .filter(v => !v.startsWith('/') && !['http', 'https'].includes(v))
            .map(v => v.replace(/\//g, ''));
    }

    cancel() {
        this.progressCancel$.next();
        this.progressCancel$.complete();
        this.progressCancel$.unsubscribe();
    }
}
