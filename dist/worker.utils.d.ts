export declare type Fn = (...args: any[]) => any;
export declare type ToAsync<T extends Fn> = (...args: Parameters<T>) => Promise<ReturnType<T>>;
export declare const WORKER: unique symbol;
export declare type WithWorker = {
    [WORKER]?: Worker;
};
export declare const createWorker: <T extends Fn>({ fn, context, transfer }: {
    fn: string | T;
    context?: (string | Fn)[] | undefined;
    transfer?: Transferable[] | undefined;
}) => ToAsync<T> & WithWorker;
export declare function terminateWorker(f: WithWorker): void;
export declare function split(n: number, steps: number): number[][];
export declare type TypedArrayConstructor = Int32ArrayConstructor | Float64ArrayConstructor;
export declare type TypedArray<T extends TypedArrayConstructor> = T extends Int32ArrayConstructor ? Int32Array : Float64Array;
export declare function createSharedView<T extends TypedArrayConstructor>(data: Iterable<number>, Constructor: T): TypedArray<T>;
export declare function createMutex(): Int32Array;
export declare function lock(mutex: Int32Array): void;
export declare function unlock(mutex: Int32Array): void;
//# sourceMappingURL=worker.utils.d.ts.map