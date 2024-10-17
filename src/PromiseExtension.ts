import type { Pool } from "./Pool.ts";
import type { WorkerWrapper } from "./WorkerWrapper.ts";
import type { WorkerAny, WorkerDefinition } from "./mod.ts";
import type {
  TaskInfo,
  ThreadState,
  WorkerPromiseGeneratorNamed,
} from "./types.ts";

export function buildPromiseExtension(
  id: string,
  wrapper: WorkerWrapper,
  generator: WorkerPromiseGeneratorNamed,
  self: WorkerDefinition,
  pool: Pool,
  args: WorkerAny = {},
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
  private _resolve?: (value: SharedArrayBuffer) => void;
  // deno-lint-ignore no-explicit-any
  private _reject?: (error?: any) => void;
  public timerIds: number[] = [];
  public settledCount: number = 0;
  public buffer: SharedArrayBuffer;
  public wrapper: WorkerPromiseGeneratorNamed;
  public pool: Pool;
  public args: WorkerAny;
  public name: string;

  public promise: Promise<SharedArrayBuffer>;
  public timer: number | undefined;

  constructor(
    id: string,
    args: WorkerAny,
    name: string,
    buffer: SharedArrayBuffer,
    wrapper: WorkerPromiseGeneratorNamed,
    pool: Pool,
  ) {
    this.promise = new Promise<SharedArrayBuffer>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
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

  public then(
    onSuccess: (
      value: SharedArrayBuffer,
    ) => SharedArrayBuffer | PromiseLike<SharedArrayBuffer>,
    onReject: (reason: unknown) => never | PromiseLike<never>,
  ) {
    return this.promise.then(onSuccess, onReject);
  }

  public catch(
    onReject: (reason: unknown) => never | PromiseLike<never>,
  ) {
    return this.promise.then(undefined, onReject);
  }

  get resolve(): (value: SharedArrayBuffer) => void {
    return this._resolve!;
  }

  // deno-lint-ignore no-explicit-any
  get reject(): (error?: any) => void {
    return this._reject!;
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

    const timer = setTimeout(() => {
      const threadId = this.pool!.getThreadStates().find(
        (state: ThreadState) => {
          const taskId = state.tasks.find((task: TaskInfo) => {
            return task.id === this.id;
          })?.id;

          return taskId === this.id;
        },
      );
      threadId && this.pool.removeWorker(threadId.id);
      this.reject(new Error("Worker terminated"));
    }, 1_000);

    this.timer = timer;
  }
}
