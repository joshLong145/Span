import { resolve } from "https://deno.land/std@0.211.0/path/resolve.ts";
import { WorkerPromise } from "./types.ts";
import { WorkerHandler } from "./Worker.ts";

export class Pool {
  public threads: WorkerHandler[] = [];
  public tasks: any = [];
  private _args: any = [];
  private _waitLock: Promise<void> | undefined;
  private _waitLockResolver: any | undefined;

  constructor(args: any) {
    this._args = args;
  }

  init = async (definition: string): Promise<void> => {
    for (let i = 0; i < this._args.workerCount; i++) {
      //@ts-ignore deno option
      this.threads.push(new WorkerHandler(definition, {}));
    }
    const isReady = () => {
      const ready = this.threads.filter((thrad) => thrad.isReady()).length ===
        this._args.workerCount;
      return ready;
    };
    while (!isReady()) {
      await this._wait(10);
    }
  };

  findWorkerForId = (id: string): WorkerHandler | undefined => {
    for (let i = 0; i < this.threads.length; i++) {
      if (this.threads[i]._executionMap[id]) {
        return this.threads[i];
      }
    }

    return undefined;
  };

  exec = (task: WorkerPromise) => {
    const thread = this.threads.find((t) => {
      return t.isReady();
    });
    if (!thread) {
      task.reject(new Error("Max pool queue reached"));
    }

    this.tasks.push(task);
    this._next().catch(() => {});
  };

  getThreadStates = (): Record<string, any>[] => {
    return this.threads.map((t) => {
      return {
        state: t.state,
        tasks: Object.keys(t._executionMap),
      };
    });
  };

  terminate = (): void => {
    for (let i = 0; i < this.threads.length; i++) {
      this.threads[i].worker.terminate();
    }
  };

  _next = (): Promise<void> => {
    return new Promise<void>((resolve, _reject) => {
      if (this.tasks.length > 0) {
        const thread = this.threads.find((t) => {
          return t.isReady();
        });
        if (!thread) {
          _reject();
          return;
        }
        const task = this.tasks.shift();
        thread._executionMap[task.id] = {
          promise: task,
          resolve: task.resolve,
          reject: task.reject,
        };
        thread.worker.postMessage({
          name: task.name,
          id: task.id,
          buffer: task.buffer,
          args: task.args,
        });

        thread.state = "BUSY";

        this._next().catch(() => {});
      } else {
        resolve();
      }
    });
  };

  _wait = (ms: number): Promise<void> => {
    return new Promise<void>((res, _) => {
      setTimeout(res, ms);
    });
  };

  /** */
  public static uuidv4(): string {
    //@ts-ignore
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(
      /[018]/g,
      (c: number) =>
        (crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(
          16,
        ),
    );
  }
}
