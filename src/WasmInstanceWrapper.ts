import {
  DiskIOProvider,
  InstanceConfiguration,
  WasmWorkerInstance,
} from "./types.ts";
import { WorkerBridge } from "./WorkerBridge.ts";
import { WorkerManager } from "./WorkerManager.ts";
import { WorkerMethod, WorkerWrapper } from "./WorkerWrapper.ts";

/**
 * Base class for worker imlementation.
 * All methods within a class which extends this
 * Allows for WASM modules to be loaded and initalized
 * through a file path as a constructor argument. If any
 * supporting javascript is needed, it may be loaded through
 * configuring `addons` when configuring the Wrapper.
 */
export class WasmWorkerDefinition {
  public execMap: Record<
    string,
    (options?: Record<string, any>) => Promise<SharedArrayBuffer>
  > = {};

  /**
   * Worker instance, can be stopped by calling terminateWorker
   */
  public worker: Worker | undefined = undefined;

  /**
   * Path to the WASM module being loaded into the worker.
   */
  public ModulePath: string;

  private workerString = "";

  constructor(modulePath: string) {
    this.ModulePath = modulePath;
  }

  /**
   * Run implemented methods from within the worker instance
   * @example
   * await workerDefintion.execute('foo', {bar: true});
   * @param {keyof} name of method impleemnted on this class
   * @param {Record<string,any>} args to pass to the method
   * @returns {SharedArrayBuffer}
   */
  public execute(name: keyof this, options?: any): Promise<SharedArrayBuffer> {
    return this.execMap[name as unknown as string](options);
  }

  /**
   * Calls terminate on the worker instace
   */
  public terminateWorker() {
    this.worker?.terminate();
  }
}

/**
 * Creates a new worker and initalizes it with methods from
 * the class instance provided. Currently will create the worker as a module
 * the current implementation will bind onmessage handlers in the worker
 * the imlpementation is used internally and should not be modified.
 *
 * **note** when using with file generation, the worker instance will be loaded into the global object as `worker`
 */
export class WasmInstanceWrapper<T extends WasmWorkerDefinition> {
  private _instance: WasmWorkerInstance<T>;
  private _config: InstanceConfiguration;

  private _wm: WorkerManager | undefined;
  private _wb: WorkerBridge<T> | undefined;

  private workerString = "";

  constructor(instance: WasmWorkerInstance<T>, config: InstanceConfiguration) {
    this._instance = instance;
    this._config = config;
    this._generate();
  }

  private _generate(): void {
    const keys = Reflect.ownKeys(Object.getPrototypeOf(this._instance)) as [
      keyof T,
    ];
    const wrps: WorkerWrapper[] = [];
    for (const key of keys) {
      key !== "constructor" &&
        wrps.push(new WorkerWrapper(this._instance[key] as WorkerMethod));
    }
    this._wm = new WorkerManager(wrps);
    this._wb = new WorkerBridge({
      workers: wrps,
      namespace: this._config.namespace ?? "",
    });

    const module = this._config.moduleLoader
      ? this._config.moduleLoader(
        (this._instance as WasmWorkerDefinition).ModulePath,
      )
      : "";

    let execFd = "";

    for (const addon of this._config?.addons ?? []) {
      const source = this._config.addonLoader
        ? this._config.addonLoader(addon)
        : "";
      execFd = execFd ? `${execFd}\n${source}` : source;
    }

    this.workerString = `
            ${execFd}
            self['mod'] = globalThis.Go ? new Go() : undefined;
            let workerState = "PENDING";
            var buffer = new ArrayBuffer(${module.length});
            var uint8 = new Uint8Array(buffer);
            uint8.set([
        `;
    for (let i = 0; i < module.length; i++) {
      if (i == module.length - 1) {
        this.workerString += module[i];
        continue;
      }
      this.workerString += module[i] + ",";
    }

    this.workerString += `
            ]); 
            if (typeof wasm_bindgen === "undefined" && typeof initSync === "undefined") {
              WebAssembly.instantiate(uint8, self['mod'] ? self['mod'].importObject : {}).then((module) => {
                // tell the host that we can start
                self.mod && self.mod.run(module.instance);
                self.module = module;
                for (const key of Object.keys(self.module.instance.exports)) {
                  self[key] = self.module.instance.exports[key];
                }
                workerState = "READY";
                postMessage({
                  ready: true
                })
              });
            } else {
              if(typeof wasm_bindgen === "undefined") {
                initSync && initSync(uint8);
                for (const key of Object.keys(wasm)){
                  self[key] = wasm[key];
                } 
                workerState = "READY";
                postMessage({
                  ready: true
                });
              } else if(typeof wasm_bindgen !== "undefined") {
                wasm_bindgen && ((module) =>{
                  self.module = module;
                  self.module.initSync(uint8);
                  for (const key of Object.keys(self.module)) {
                    self[key] = self.module[key];
                  }
    
                  workerState = "READY";
                  postMessage({
                    ready: true
                  });
                })(wasm_bindgen);
              }
            }
        `;
  }

  /**
   * Create the web worker, adds an instance of a Worker object to the given class instance.
   * Current only supports the `onmessage` handler. but object may be accesed as the `worker` property
   */
  public async start() {
    this?._wb?.bufferMap(this._instance);
    const workers = this?._wb?.workerWrappers(this._instance) ?? [];
    for (const w of workers) {
      (this._instance as WasmWorkerDefinition).execMap[(w as any)._name] = w;
    }

    await this?._wb?.workerBootstrap(
      this._instance as T,
      this.workerString + "\n" + this?._wm?.CreateWorkerMap() + "\n" +
        this?._wm?.CreateOnMessageHandler(),
    );
  }

  /**
   * Creates the worker and bridging as generated output as `bridge` to a directory
   * the bootstrapping logic will load methods from the provided instance to the global object
   */
  public create(provider: DiskIOProvider): void {
    if (!this._config.outputPath) {
      throw new Error(
        "No output path provided in configuration, aborting generation",
      );
    }
    const enc = new TextEncoder();
    this._generate();
    let worker = `
${this.workerString}\n
${this?._wm?.CreateWorkerMap()}\n
${this?._wm?.CreateOnMessageHandler()}`;

    provider.writeFileSync(
      this._config.outputPath + "/bridge.js",
      enc.encode(
        `${this?._wb?.createBridge(worker)}`,
      ),
    );
  }

  /**
   * Regenerates the worker
   */
  public restart() {
    this?._wb?.workerBootstrap(
      this._instance as T,
      this.workerString + "\n" + this?._wm?.CreateWorkerMap() + "\n" +
        this?._wm?.CreateOnMessageHandler(),
    );
  }
}
