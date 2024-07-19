import type { Pool } from "./Pool.ts";
import type { WorkerWrapper } from "./WorkerWrapper.ts";
import type { WorkerDefinition } from "./mod.ts";
import type { WorkerPromiseGeneratorNamed } from "./types.ts";

export function buildPromiseExtension(
  id: string,
  wrapper: WorkerWrapper,
  generator: WorkerPromiseGeneratorNamed,
  self: WorkerDefinition,
  pool: Pool,
  args: any = {},
): TaskPromise {
  const prms = new TaskPromise(
    id,
    args,
    wrapper.WorkerName ?? (wrapper as unknown as { _name: string })._name,
    self.bufferMap[wrapper.WorkerName],
    generator,
    pool,
  );
  return prms;
}

export class TaskPromise {
  public id: string;
  public resolve?: (value: SharedArrayBuffer) => void;
  public reject?: (error?: any) => void;
  public timerIds: number[] = [];
  public settledCount: number = 0;
  public buffer: SharedArrayBuffer;
  public wrapper: WorkerPromiseGeneratorNamed;
  public pool: Pool;
  public args: any;
  public name: string;

  public promise: Promise<SharedArrayBuffer>;

  constructor(
    id: string,
    args: any,
    name: string,
    buffer: SharedArrayBuffer,
    wrapper: WorkerPromiseGeneratorNamed,
    pool: Pool,
  ) {
    this.promise = new Promise<SharedArrayBuffer>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    }).finally(() => {
      for (let i = 0; i < this.timerIds.length; i++) {
        clearTimeout(this.timerIds[i]);
      }
      this.settledCount += 1;
    });

    this.id = id;
    this.args = args, this.wrapper = wrapper;
    this.buffer = buffer;
    this.pool = pool;
    this.name = name;
  }

  public timeout(delay: number) {
    const timerId = setTimeout(this._timeout.bind(this), delay);
    this.timerIds.push(timerId);
  }

  private _timeout() {
    const worker = this.pool.findWorkerForId(this.id);
    if (!worker) {
      console.warn("could not find worker for task id: ", this.id);
      return;
    }

    worker?.worker.postMessage({
      name: `${this.wrapper._name}`,
      id: this.id,
      action: "TERM",
    });

    this.reject && this.reject(
      new Error("Timeout has occured, aborting worker execution"),
    );
  }
}
