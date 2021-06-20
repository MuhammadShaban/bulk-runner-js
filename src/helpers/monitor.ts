import { queue } from './queue';
import { IObject } from './model';
import { getTimeDiff } from './utils';

export class Monitor {
    private start_time = process.hrtime();
    private _progress: IObject = {
        total: 0,
        done: 0,
        success: 0,
        faild: 0,
        inProgress: 0,
        readingDone: false,
        time: 0
    };

    constructor(private requestId: string) { }

    get progress() {
        return this._progress;
    }

    updateProgress(obj: IObject = {}) {
        for (const [key, value] of Object.entries(obj)) this._progress[key] += value;

        this._progress.time = getTimeDiff(this.start_time);
        queue.set(this.requestId, { progress: this._progress });
    }

    updateTotal(total: number, readingDone: boolean = false) {
        this._progress.total = total;
        this._progress.readingDone = readingDone;
        queue.set(this.requestId, { progress: this._progress });
    }

    get(): IObject {
        return queue.get(this.requestId);
    }

    del(): boolean {
        return queue.del(this.requestId);
    }

    isDone(): boolean {
        return this._progress.readingDone && this._progress.total === this._progress.done;
    }

    toString(): string {
        let str = 'Progress: ';
        for (const [key, value] of Object.entries(this._progress)) str += `[${key.toUpperCase()}: ${value}] `;
        return str.trim();
    }
}
