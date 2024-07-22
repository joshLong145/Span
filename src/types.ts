import type { WorkerDefinition } from "./InstanceWrapper.ts";
import type { Pool } from "./Pool.ts";
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
  workerCount: number;
}

export interface DiskIOProvider {
  writeFileSync: (path: string | URL, data: Uint8Array) => void;
}

export declare type WorkerPromiseGenerator = (
  args: Record<string, any>,
) => TaskPromise;
export declare type WorkerPromiseGeneratorNamed =
  & { _name: string }
  & WorkerPromiseGenerator;

export declare interface WorkerEvent {
  name: string;
  buffer: SharedArrayBuffer;
  id: number;
  args: Record<string, any>;
}

export declare interface PoolArgs {
  workerCount: number;
}

export declare interface TaskInfo {
  id: string;
  functionName: string;
  args: unknown[];
}
export declare interface ThreadState {
  state: string;
  tasks: TaskInfo[];
}
