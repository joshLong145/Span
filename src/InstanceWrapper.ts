import { WorkerPromise } from "./types.ts";
import {
  DiskIOProvider,
  InstanceConfiguration,
  WorkerInstance,
} from "./types.ts";
import { WorkerBridge } from "./WorkerBridge.ts";
import { WorkerManager } from "./WorkerManager.ts";
import { WorkerMethod, WorkerWrapper } from "./WorkerWrapper.ts";

/**
 * Base class for worker imlementation
 * All methods within a class which extends this
 * will be run within the web worker
 *
 * @example
 * export class FibDefinition extends WorkerDefinition {
 *  constructor() {
 *    super();
 *  }
 *
  *  public method fib(buffer: SharedArrayBuffer, args: Record<string, any>): Promise<SharedArrayBuffer> {
 *    var a = 1, b = 0, temp;

      while (num >= 0){
        temp = a;
        a = a + b;
        b = temp;
        num--;
      }
      let buff = new Uint8Array(buffer);
      buff[0] = b;
 *  }
* }
 */
export class WorkerDefinition {
  public execMap: Record<
    string,
    (args: Record<string, any>) => WorkerPromise
  > = {};

  /** */
  public _executionMap: Record<string, any> = {};

  /** */
  public bufferMap: Record<string, SharedArrayBuffer> = {};

  /**
   * worker instance, can be stopped by calling terminateWorker
   */
  // deno-lint-ignore no-explicit-any
  public worker: any | undefined = undefined;

  constructor() {}

  /**
   * @returns
   */
  public uuidv4() {
    //@ts-ignore
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(
      /[018]/g,
      (c: number) =>
        (crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(
          16,
        ),
    );
  }

  /**
   * Run implemented methods from within the worker instance
   *
   * example: await workerDefintion.execute('foo', {bar: true});
   * @param {keyof} name of method impleemnted on this class
   * @param {Record<string,any>} args to pass to the method
   * @returns {SharedArrayBuffer}
   */
  public execute(
    name: keyof this,
    args: Record<string, any> = {},
  ): WorkerPromise {
    return this.execMap[name as unknown as string](args);
  }

  /**
   * Return the promise controlling a specific method within the worker
   */
  public get(
    name: keyof this,
  ): void | Promise<SharedArrayBuffer> {
    return this.execMap[name as unknown as string] as any;
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
 * **note** when using with file generation, the worker instance will be loaded into the global object as `worker`
 *
 * @example
 *  class FibWorkerDefinition extends Worker Definition {
 *
 *    constructor() { super(); }
 *
 *    public method fib(buffer: SharedArrayBuffer, args: Record<string, any>): Promise<SharedArrayBuffer> {
 *      var a = 1, b = 0, temp;
        cosnt num = args.limit;
        while (num >= 0){
          temp = a;
          a = a + b;
          b = temp;
          num--;
        }
        let buff = new Uint8Array(buffer);
        buff[0] = b;
 *    }
 *  }
 *
 *  const fibWorker = new FibWorkerDefinition();
 *  const wrapper = new InstanceWrapper(fibWorker, {});
 *  // start the worker
 *  await wrapper.start();
 *  let buffer = await fibWorker.execute('fib', {limit: 20});
 *
 *  // log the result
 *  console.log(new Uint8Array(buffer)[0]);
 */
export class InstanceWrapper<T extends WorkerDefinition> {
  private _config: InstanceConfiguration;
  private _instance: WorkerInstance<T>;
  private _wm: WorkerManager | undefined;
  private _wb: WorkerBridge | undefined;
  private _workerString = "";

  constructor(instance: WorkerInstance<T>, config: InstanceConfiguration) {
    this._instance = instance;
    this._config = config;
    this._generate();
  }

  /**
   * Create the web worker, adds an instance of a Worker object to the given class instance.
   * Current only supports the `onmessage` handler. but object may be accesed as the `worker` property
   */
  public async start(): Promise<void> {
    this?._wb?.bufferMap(this._instance as WorkerDefinition);
    const ww = this?._wb?.workerWrappers(this._instance as WorkerDefinition);
    if (!ww) {
      throw new Error("unable to process worker definition");
    }
    for (const w of ww) {
      (this._instance as WorkerDefinition).execMap[w._name] = w;
    }

    this._workerString = this._workerString + "\n" +
      this?._wm?.CreateWorkerMap() + "\n" +
      this?._wm?.CreateOnMessageHandler();

    // tell the host we can start as this is done in the wasm instance wrapper
    // this will allow the promise being awaited to resolve by the caller.
    this._workerString += this._config.modulePath
      ? ""
      : `postMessage({ready: true}); ${
        this._config.namespace != undefined ? this._config.namespace : "span"
      }.workerState = "READY";`;

    await this?._wb?.workerBootstrap(
      this._instance as T,
      this._workerString,
    );
  }

  /**
   * Regenerates the worker
   */
  public async restart(): Promise<void> {
    if (!this._workerString) {
      throw new Error("Must call start before restart, Aborting operation");
    }

    await this?._wb?.workerBootstrap(
      this._instance as T,
      this._workerString,
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

    const worker = `
      ${this._workerString}\n
      ${this?._wm?.CreateWorkerMap()}\n
      ${this?._wm?.CreateOnMessageHandler()}`;

    provider.writeFileSync(
      this._config.outputPath + "/bridge.js",
      enc.encode(
        `${this?._wb?.createBridge(worker)}`,
      ),
    );
  }

  private _generate(): void {
    const protoKeys = Reflect.ownKeys(
      Object.getPrototypeOf(this._instance),
    ) as [keyof T];
    const baseKeys = Object.keys(this._instance) as [keyof T];
    const allKeys = baseKeys.concat(protoKeys).filter((key) => {
      return key !== "constructor" && key !== "execMap" &&
        key !== "bufferMap" &&
        key !== "_executionMap" && key !== "worker" &&
        key !== "ModulePath" && key !== "workerString";
    });
    const wrps: WorkerWrapper[] = [];
    for (const key of allKeys) {
      wrps.push(new WorkerWrapper(this._instance[key] as WorkerMethod));
    }

    this._wm = new WorkerManager(wrps, this._config.namespace ?? "");
    this._wb = new WorkerBridge({
      workers: wrps,
      namespace: this._config?.namespace as string,
      modulePath: this._config?.modulePath ?? "",
    });

    let execFd = `
let ${this._config.namespace ?? "span"} = {}
${this._config.namespace ?? "span"}.workerState = "PENDING";
`;

    for (const addon of this._config?.addons ?? []) {
      const source = this._config.addonLoader
        ? this._config.addonLoader(addon)
        : "";
      execFd = execFd ? `${execFd}\n${source}` : source;
    }
    this._workerString += execFd;
    this._config.modulePath
      ? this._workerString += this._genWebAssemblyBinding()
      : this._workerString += `postMessage({ready: true}); ${
        this._config.namespace ?? "span"
      }.workerState = "READY";`;
  }

  private _genWebAssemblyBinding(): string {
    const module = this._config.moduleLoader
      ? this._config.moduleLoader(this._config?.modulePath ?? "")
      : "";

    let retStr = "";
    retStr += `
      self['mod'] = globalThis.Go ? new Go() : undefined;
      var buffer = new ArrayBuffer(${module.length});
      var uint8 = new Uint8Array(buffer);
      uint8.set([
    `;

    for (let i = 0; i < module.length; i++) {
      if (i == module.length - 1) {
        retStr += module[i];
        continue;
      }
      retStr += module[i] + ",";
    }

    return `
      ${retStr}
      ]);
      if (typeof wasm_bindgen === "undefined" && typeof initSync === "undefined") {
        WebAssembly.instantiate(uint8, self['mod'] ? self['mod'].importObject : {}).then((module) => {
          // tell the host that we can start
          self.mod && self.mod.run(module.instance);
          self.module = module;
          for (const key of Object.keys(self.module.instance.exports)) {
            self[key] = self.module.instance.exports[key];
          }
          ${this._config.namespace ?? "span"}.workerState = "READY";
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
          ${this._config.namespace ?? "span"}.workerState = "READY";
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

            ${this._config.namespace ?? "span"}.workerState = "READY";
            postMessage({
              ready: true
            });
          })(wasm_bindgen);
        }
      }
    `;
  }
}
