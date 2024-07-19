import type { TaskPromise } from "./PromiseExtension.ts";
import type { PoolArgs, TaskInfo, ThreadState } from "./types.ts";
import { WorkerHandler } from "./Worker.ts";

export class Pool {
  public threads: WorkerHandler[] = [];
  public tasks: TaskPromise[] = [];
  private _args: PoolArgs;
  private _waitLock: Promise<void> | undefined;
  private _waitLockResolver: any | undefined;

  constructor(args: PoolArgs) {
    this._args = args;
  }

  init = async (definition: string): Promise<void> => {
    for (let i = 0; i < this._args.workerCount; i++) {
      this.threads.push(new WorkerHandler(definition, {}));
    }
    const isReady = () => {
      const ready = this.threads.filter((thread) => thread.isReady()).length ===
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

  exec = (task: TaskPromise) => {
    const thread = this.threads.find((t) => {
      return t.isReady();
    });
    if (!thread) {
      //@ts-ignore is defined
      task.reject(new Error("Max pool queue reached"));
    }

    this.tasks.push(task);
    this._next();
  };

  getThreadStates = (): ThreadState[] => {
    return this.threads.map((t) => {
      const tasks: TaskInfo[] = [];
      for (const taskId of Object.keys(t._executionMap)) {
        tasks.push({
          id: taskId,
          functionName: t._executionMap[taskId]?.promise?.name,
          args: t._executionMap[taskId]?.promise?.args,
        });
      }
      return {
        state: t.state,
        tasks: tasks,
      };
    });
  };

  terminate = (): void => {
    for (let i = 0; i < this.threads.length; i++) {
      this.threads[i].worker.terminate();
    }
  };

  _next = (): Promise<void | SharedArrayBuffer> | undefined => {
    if (this.tasks.length > 0) {
      const thread = this.threads.find((t) => {
        return t.isReady();
      });

      if (!thread) {
        return;
      }

      thread.state = "BUSY";
      const task = this.tasks.shift();
      // if we cant find the task id just bail out
      if (!task?.id) {
        thread.state = "IDLE";
        return;
      }

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
    }
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
