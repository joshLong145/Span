import type { TaskPromise } from "./PromiseExtension.ts";
import type { WorkerWrapper } from "./WorkerWrapper.ts";

export interface BridgeConfiguration {
  namespace: string;
  workers: WorkerWrapper[];
}

export interface InstanceConfiguration {
  outputPath?: string;

  /**
   * namespace which WASM module module methods will be instantiated on.
   */
  namespace?: string;

  /**
   * Additional code to be executed within the Worker.
   * Addons will only be loaded once per Worker.
   * code loaded within the Worker context should
   * not conflict methods on the class being wrapped.
   * @param path path to the addon
   */
  addons?: string[];

  /**
   * loads code to be executed at start of the Web Worker
   * @returns
   */
  addonLoader?: (path: string) => string;

  /*
    returns the WASM module as a Uint8Array
  */
  moduleLoader?: (path: string) => Uint8Array;

  /*
    path on disk to a compiled wasm module
  */
  modulePath?: string;

  /**
   * the maximum number of workers which should be created
   */
  workerCount?: number;

  /**
   * the maximum number of tasks each worker can add to their queue
   */
  taskCount?: number;
}

export interface DiskIOProvider {
  writeFileSync: (path: string | URL, data: Uint8Array) => void;
}

export declare type WorkerPromiseGenerator = (
  args: WorkerAny,
) => TaskPromise;

export declare type WorkerPromiseGeneratorNamed =
  & { _name: string }
  & WorkerPromiseGenerator;

export declare interface Task {
  name: string;
  buffer: SharedArrayBuffer;
  id: number;
  args: AsJson<WorkerAny>;
  action?: string;
  error?: string;
}

export type WorkerState = "READY" | "IDLE" | "BUSY" | "TERM" | "ABORT";

export type WorkerMessage = Task | { [key: string]: WorkerState };

export declare interface PoolArgs {
  workerCount: number;
  taskCount: number;
}

export declare interface TaskInfo {
  id: string;
  functionName: string;
  args: WorkerAny;
}
export declare interface ThreadState {
  state: string;
  tasks: TaskInfo[];
  id: string;
}

export interface WorkerAny {
  [key: string | number]: string | number | boolean | null | WorkerAny;
}

/**
 * Enforces types which can be serialized with `JSON.stringify`.
 */
export type AsJson<T> = T extends string | number | boolean | null ? T
  // Function type used for coalesce
  // deno-lint-ignore ban-types
  : T extends Function ? never
  : T extends object ? { [K in keyof T]: AsJson<T[K]> }
  : never;
