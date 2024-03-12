export declare type WorkerMethod = (
  buffer: SharedArrayBuffer,
  module: Record<string, any>,
) => ArrayBuffer;

export class WorkerWrapper {
  private _worker: WorkerMethod;

  constructor(method: WorkerMethod) {
    this._worker = method;
  }

  get WorkerName() {
    return this._worker.name;
  }

  private _serializeWorker(): string {
    return `${this._worker.toString()}`;
  }

  public CreateExecMapping(): string {
    return `"${this.WorkerName}": ${this._serializeWorker()},`;
  }
}
