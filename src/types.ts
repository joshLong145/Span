import { WorkerDefinition } from "./InstanceWrapper.ts";
import { WorkerWrapper } from "./WorkerWrapper.ts";

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
}

export interface DiskIOProvider {
  writeFileSync: (path: string | URL, data: Uint8Array) => void;
}

// Helper type to get R if V is callable, N otherwise
// Typically to get `never` if V is not callable
type KeepCallable<V, R = V, N = never> = V extends (...args: any) => any ? R
  : N;

type BaseFunctionTypes<T> = (
  name: keyof T,
  args?: Record<string, any>,
) => Promise<SharedArrayBuffer> | void;

export type WorkerFunctions<B, T extends B> = {
  [
    Key in keyof T as KeepCallable<
      T[Key],
      Key
    >
  ]: B[Key extends keyof B ? Key : never] extends undefined ? WorkerMethod
    : BaseFunctionTypes<T>;
};

export type WorkerInstance<T extends WorkerDefinition> = WorkerFunctions<
  WorkerDefinition,
  T
>;

export declare type WorkerMethod = SyncWorkerMethod | AsyncWorkerMethod;

export declare type AsyncWorkerMethod = (
  buffer: SharedArrayBuffer,
  module: Record<string, any>,
) => Promise<ArrayBuffer>;

export declare type SyncWorkerMethod = (
  buffer: SharedArrayBuffer,
  module: Record<string, any>,
) => ArrayBuffer;

export declare interface WorkerEvent {
  name: string;
  buffer: SharedArrayBuffer;
  id: number;
  args: Record<string, any>;
}
