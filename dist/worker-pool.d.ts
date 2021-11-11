import { Fn } from './worker.utils';
export declare class WorkerPool {
    private uid;
    private maxWorkers;
    private scheduled;
    private running;
    constructor(maxWorkers?: number);
    private checkToRunTask;
    private handleTaskFinished;
    private createTaskId;
    addTask<T extends Fn>({ fn, args, context, transfer }: {
        fn: T | string;
        args?: Parameters<T>;
        context?: (Fn | string)[];
        transfer?: Transferable[];
    }): {
        id: number;
        result: Promise<ReturnType<T>>;
    };
    terminateTask(id: number): void;
    terminateAllTasks(): void;
}
//# sourceMappingURL=worker-pool.d.ts.map