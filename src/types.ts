import { WorkerDefinition } from "./InstanceWrapper.ts";
import { WasmWorkerDefinition } from "./WasmInstanceWrapper.ts";
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
}

export interface DiskIOProvider {
  writeFileSync: (path: string | URL, data: Uint8Array) => void;
}

export type WorkerInstance<T extends WorkerDefinition> =
  & WorkerDefinition
  & WorkerFunctions<WorkerDefinition, T>;

// Helper type to get R if V is callable, N otherwise
// Typically to get `never` if V is not callable
type KeepCallable<V, R = V, N = never> = V extends (...args: any) => any ? R
  : N;

// Removes properties from a type which extend a given type.
type FlagExcludedType<Base, Type> = {
  [Key in keyof Base]: Base[Key] extends Type ? never : Key;
};

export type WorkerFunctions<B, T> = {
  [
    Key in keyof T as KeepCallable<
      FlagExcludedType<B, T[Key]>,
      Key
    >
  ]: WorkerMethod;
};
export type WasmWorkerInstance<T extends WasmWorkerDefinition> =
  & WasmWorkerDefinition
  & WorkerFunctions<WasmWorkerDefinition, T>;

export declare type WorkerMethod = (
  buffer: SharedArrayBuffer,
  module: Record<string, any>,
) => ArrayBuffer;

export declare interface WorkerEvent {
  name: string;
  buffer: SharedArrayBuffer;
  id: number;
  args: Record<string, any>;
}
