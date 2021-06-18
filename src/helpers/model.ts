export interface IObject {
    [key: string]: any;
}

export type IDriver = 'local' | 's3';

export interface IOptions {
    url: string;
    method: string;
    data?: IObject | string | null;
    params?: IObject | string | null;
    headers?: IObject | string | null;
    timeout?: number | null;
    results_map?: IObject | string | null;
    batch_file: string;
    batch_size: number;
    throughput?: number | null;
}

export interface IResultst {
    driver: IDriver;
    tempPath: string;
    savePath?: string;
}
