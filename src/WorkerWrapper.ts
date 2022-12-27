export declare type WorkerMethod = (buffer: ArrayBuffer, ...args: any[]) => ArrayBuffer;

export class WorkerWrapper {
    private _worker: WorkerMethod;

    constructor(method: WorkerMethod) {
        this._worker = method;
    }

    get WorkerName() {
        return this._worker.name;
    }

    private _serializeWorker(): string {
        return `function ${this._worker.toString()}`;
    }

    public CreateExecMapping(): string {
        return `"${this.WorkerName}": ${this._serializeWorker()},`;
    }
};