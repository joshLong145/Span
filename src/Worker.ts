import { STATES } from "./constants.ts";
import type {
  Task,
  ThreadState,
  WorkerAny,
  WorkerMessage,
  WorkerState,
} from "./mod.ts";
import { Pool } from "./Pool.ts";
import type { TaskPromise } from "./PromiseExtension.ts";

// deno-lint-ignore-file no-explicit-any
export class WorkerHandler {
  private sourceDef: string;
  private _args: WorkerAny;

  public _executionMap: Record<string, TaskPromise> = {};

  // deno-lint-ignore no-explicit-any
  public worker: any;
  public state: string = STATES.BUSY;
  public id: string;
  constructor(source: string, args: WorkerAny) {
    this._args = args;
    this.sourceDef = source;
    this.id = Pool.uuidv4();

    const blob = new Blob([source], { type: "application/typescript" });

    this.worker = new Worker(URL.createObjectURL(blob), {
      //@ts-ignore: deno flag
      deno: globalThis.Deno ? true : false,
      type: "module",
    });

    this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      if ((e.data as Record<string, WorkerState>).READY) {
        this.state = STATES.IDLE;
        return;
      }

      const workerTask: MessageEvent<Task> = e as MessageEvent<Task>;
      if (!this._executionMap[workerTask.data.id]) {
        return;
      }

      const context = this._executionMap[workerTask.data.id];

      if ((workerTask.data as Task).action === "TERM") {
        context &&
          context.reject(
            new Error("Timeout has occured, aborting worker execution"),
          );
        delete this._executionMap[workerTask.data.id];
        context.timer && clearTimeout(context.timer);
        context && context.reject(new Error("Timeout occured"));
        return;
      }

      if (workerTask.data.error) {
        context &&
          context.reject!(
            new Error("Error occured in worker: " + workerTask.data.error),
          );
      } else {
        context && context.resolve!(workerTask.data.buffer);
        this._executionMap[workerTask.data.id].buffer = workerTask.data.buffer;
      }

      delete this._executionMap[workerTask.data.id];

      if (Object.keys(this._executionMap).length === 0) {
        this.state = STATES.IDLE;
      } else if (
        Object.keys(this._executionMap).length < this._args.taskCount
      ) {
        this.state = STATES.READY;
      } else {
        this.state = STATES.BUSY;
      }
    };
  }

  public get State(): WorkerState {
    let state: WorkerState = STATES.BUSY;
    if (this.isReady()) {
      if (Object.keys(this._executionMap).length < this._args.taskCount ?? 1) {
        state = STATES.READY;
      }
    } else {
      state = STATES.BUSY;
    }

    return state;
  }

  public isReady(): boolean {
    const taskCount: number = (this._args?.taskCount as number) ?? 1;
    return (
      this.state === STATES.IDLE ||
      Object.keys(this._executionMap).length < taskCount
    );
  }
}
