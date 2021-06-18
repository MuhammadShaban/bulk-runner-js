import { createWriteStream, WriteStream } from 'fs';
import { resolve } from 'path';
import { EventEmitter } from 'events';
import { flatten } from 'flat';

import { convertIntoObject } from './utils';
import { IObject, IResultst } from './model';

export class CsvWriter extends EventEmitter {
    private _writeStream: WriteStream;
    private _resultsMap: IObject;

    constructor(private requestId: string, private results: IResultst, private resultsMap: string) {
        super();

        const tempFileName: string = `${requestId}.csv`;
        const tempFilePath = resolve(results.tempPath, tempFileName);
        this.emit('info', `Temp file path: ${tempFilePath}`);

        this._writeStream = createWriteStream(tempFilePath);
        this._resultsMap = convertIntoObject(resultsMap);
        this.addColumns();
    }

    addColumns(): void {
        // TODO
        // We have to be sure that _resultsMap is not include order, data, request_time & request_error columns
        // And inform user that order, data, request_time & request_error columns are reserved
        const resultsMapCoulmns = Object.keys(this._resultsMap).join(',');
        const columns = `order,data,${resultsMapCoulmns},request_time,request_error`;

        this.write(columns, (error: any) => {
            if (error) return this.emit('error', `Append columns failed: ${JSON.stringify(error)}`);

            this.emit('success', `Append columns success: ${columns}`);
        });
    }

    append(order: number, data: string, results: IObject | null, time: number, error: any): void {
        const flatResults: any = results ? flatten(results) : {};
        const _error = (error?.message ?? error) || '';

        let line: string = `${order},"${data}",`;
        for (const [key, value] of Object.entries(this._resultsMap)) {
            line += flatResults[value] ?? '';
            line += ',';
        }
        line += `${time},${_error}`;

        this.write(line, (error: any) => {
            if (error) return this.emit('error', `Append new line failed: ${JSON.stringify(error)}`);

            this.emit('success', `Append new line success: ${line}`);
        });
    }

    write(line: string, cb?: any): void {
        this._writeStream.write(`${line}\r\n`, cb);
    }

    destroy() {
        this._writeStream.destroy();
    }

    // TODO
    // We need to implement this function if we need to move
    // the temp file to some where else in the same server or upload it to s3,.. etc
    save() {}
}
