import { existsSync } from 'fs';
import moment from 'moment';
import mkdirp from 'mkdirp';

import { IObject } from './model';

export const getRemoteAddress = (remoteAddress: string): string => {
    if (remoteAddress && remoteAddress.indexOf(':') > -1) {
        const arr = remoteAddress.split(':');
        remoteAddress = (arr[arr.length - 1] || '').trim();
    }

    return remoteAddress === '1' ? '127.0.0.1' : remoteAddress;
};

export const getCountryTime = (hoursAhead: number): string => {
    return moment().utc().add(hoursAhead, 'hours').format('YYYY-MM-DDTHH:mm:ss.SSS');
};

export const getTimeDiff = (time: [number, number]): number => {
    const end = process.hrtime(time);
    return +((end[0] * 1000000000 + end[1]) / 1000000).toFixed(0);
};

export const createTempPaths = async (uploadPath: string, resultsPath: string): Promise<void> => {
    if (!existsSync(uploadPath)) await mkdirp(uploadPath);
    if (!existsSync(resultsPath)) await mkdirp(resultsPath);
};

export const convertIntoArray = (str: string = ''): any[] => {
    return str.split(',').map(v => v.trim());
};

export const convertIntoObject = (str: any = ''): IObject => {
    return str.split(',').reduce((acc: IObject, obj: string) => {
        const arr = obj.split('=');
        arr[0] ? (acc[arr[0]] = arr[1] ?? null) : null;

        return acc;
    }, {});
};

export const cleanObject = (obj: IObject): IObject => {
    return JSON.parse(JSON.stringify(obj, (k, v) => v ?? undefined));
};
