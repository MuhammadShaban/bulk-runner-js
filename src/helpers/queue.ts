import { IObject } from './model';

export class Queue {
    private static instance: Queue;
    private queue: Map<string, IObject> = new Map();

    constructor() { }

    public static getInstance(): Queue {
        if (!Queue.instance) Queue.instance = new Queue();

        return Queue.instance;
    }

    set(id: string, obj: IObject): void {
        const oldObj = this.get(id);
        this.queue.set(id, { ...oldObj, ...obj });
    }

    get(id: string): IObject {
        return this.queue.get(id) || {};
    }

    del(id: string): boolean {
        return this.queue.delete(id);
    }

    size(): number {
        return this.queue.size;
    }

    toObject(): IObject {
        const queue = this.queue;
        const obj = {
            size: queue.size,
            entries: Object.fromEntries(queue)
        };

        return obj;
    }
}

export const queue = Queue.getInstance();
