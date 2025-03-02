import { STATES } from "./constants.ts";
import type { TaskPromise } from "./PromiseExtension.ts";
import type { PoolArgs, TaskInfo, ThreadState } from "./types.ts";
import { WorkerHandler } from "./Worker.ts";

export class Pool {
  public threads: WorkerHandler[] = [];
  public tasks: TaskPromise[] = [];
  private _args: PoolArgs;
  private _waitLock: Promise<void> | undefined;
  // deno-lint-ignore no-explicit-any
  private _waitLockResolver: any | undefined;
  private _definition: string | undefined;
  private _timers: number[] = [];

  constructor(args: PoolArgs) {
    this._args = args;
  }

  init = async (definition: string): Promise<void> => {
    this._definition = definition;

    for (let i = 0; i < this._args.workerCount; i++) {
      this.threads.push(
        new WorkerHandler(definition, {
          taskCount: this._args.taskCount,
        }),
      );
    }
    await this.waitForWorkersReady(2_000);
  };

  findWorkerForId = (id: string): WorkerHandler | undefined => {
    for (let i = 0; i < this.threads.length; i++) {
      if (Object.keys(this.threads[i]._executionMap).indexOf(id) > -1) {
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
      if (this.threads.length < this._args.workerCount) {
        this.threads.push(
          new WorkerHandler(this._definition!, {
            taskCount: this._args.taskCount,
          }),
        );
      } else {
        task.reject(new Error("Max pool queue reached"));
      }
    }

    this.tasks.push(task);
    this._next();

    return;
  };

  getThreadStates = (): ThreadState[] => {
    return this.threads.map((t) => {
      const tasks: TaskInfo[] = [];
      for (const taskId of Object.keys(t._executionMap)) {
        tasks.push({
          id: taskId,
          functionName: t._executionMap[taskId]?.name,
          args: t._executionMap[taskId]?.args,
        });
      }
      return {
        state: t.state,
        tasks: tasks,
        id: t.id,
      };
    });
  };

  terminate = (): void => {
    for (let i = 0; i < this.threads.length; i++) {
      this.threads[i].worker.terminate();
    }
    for (let i = 0; i < this._timers.length; i++) {
      clearTimeout(this._timers[i]);
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

      thread.state = STATES.BUSY;
      const task = this.tasks.shift();
      // if we cant find the task id just bail out
      if (!task?.id) {
        thread.state = STATES.IDLE;
        return;
      }

      (thread._executionMap[task.id] = task),
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
      this._timers.push(setTimeout(res, ms));
    });
  };

  removeWorker = (id: string): void => {
    let index = -1;
    for (let i = 0; i < this.threads.length; i++) {
      if (this.threads[i].id === id) {
        index = i;
        break;
      }
    }

    if (index > -1) {
      this.threads[index].worker.terminate();
      this.threads[index].worker = null;

      this.threads.splice(index, 1);
    }
  };

  /**
   * Waits for all worker threads to be in IDLE state
   * @param {number} timeoutMs - Maximum time to wait in milliseconds
   * @returns {Promise<void>} - Resolves when all workers are ready
   * @throws {Error} - If workers don't become ready within timeout
   */
  async waitForWorkersReady(timeoutMs = 2000) {
    const checkInterval = 10; // Check every 10ms

    // Create a promise that resolves when all workers are ready
    const workersReadyPromise = new Promise<void>((resolve, reject) => {
      // Check if already ready
      if (this.areAllWorkersIdle()) {
        return resolve();
      }

      let elapsedTime = 0;
      const intervalId = setInterval(() => {
        elapsedTime += checkInterval;

        // Check if all workers are in IDLE state
        if (this.areAllWorkersIdle()) {
          clearInterval(intervalId);
          resolve();
        } // Check if we've exceeded timeout
        else if (elapsedTime >= timeoutMs) {
          clearInterval(intervalId);
          reject(
            new Error(
              "Could not stand up all workers within the timeout period",
            ),
          );
        }
      }, checkInterval);
    });

    try {
      await workersReadyPromise;
    } catch (error) {
      this.terminate();
      throw error;
    }
  }

  /**
   * Helper method to check if all workers are idle
   * @returns {boolean} - True if all workers are in IDLE state
   */
  areAllWorkersIdle(): boolean {
    return this.threads.filter((thread) => thread.state === "IDLE").length ===
      this._args.workerCount;
  }

  /** */
  public static uuidv4(): string {
    //@ts-ignore allowed expression
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(
      /[018]/g,
      (c: number) =>
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
          .toString(
            16,
          ),
    );
  }
}
