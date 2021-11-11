"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_utils_1 = require("./worker.utils");
class Task {
    constructor({ id, fn, args, context = [], transfer = [], resolve, reject }) {
        this.id = id;
        this.fn = fn;
        this.args = args;
        this.transfer = transfer;
        this.context = context;
        this.resolve = resolve;
        this.reject = reject;
    }
}
class WorkerPool {
    constructor(maxWorkers) {
        this.uid = 0;
        this.scheduled = [];
        this.running = new Map();
        this.maxWorkers = maxWorkers || window.navigator.hardwareConcurrency;
    }
    checkToRunTask() {
        while (this.scheduled.length > 0 && this.running.size < this.maxWorkers) {
            const task = this.scheduled.shift();
            const worker = (0, worker_utils_1.createWorker)({ fn: task.fn, context: task.context, transfer: task.transfer })(...task.args);
            this.running.set(task.id, worker[worker_utils_1.WORKER]);
            worker
                .then(r => task.resolve(r))
                .catch(e => task.reject(e))
                .finally(() => this.handleTaskFinished(task.id));
        }
    }
    handleTaskFinished(id) {
        this.running.delete(id);
        this.checkToRunTask();
    }
    createTaskId() {
        this.uid = this.uid + 1;
        return this.uid;
    }
    addTask({ fn, args, context = [], transfer = [] }) {
        const id = this.createTaskId();
        return {
            id,
            result: new Promise((resolve, reject) => {
                this.scheduled.push(new Task({ id, fn, args, transfer, context, resolve, reject }));
                this.checkToRunTask();
            })
        };
    }
    terminateTask(id) {
        if (this.scheduled.find(t => t.id === id)) {
            this.scheduled = this.scheduled.filter(t => t.id !== id);
        }
        else if (this.running.has(id)) {
            this.running.get(id).terminate();
            this.handleTaskFinished(id);
        }
    }
    terminateAllTasks() {
        this.scheduled = [];
        for (let id of this.running.keys()) {
            this.terminateTask(id);
        }
    }
}
exports.default = WorkerPool;
//# sourceMappingURL=worker-pool.js.map