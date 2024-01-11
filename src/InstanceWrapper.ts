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
    (args: Record<string, any>) => Promise<SharedArrayBuffer>
  > = {};

  /**
   * worker instance, can be stopped by calling terminateWorker
   */
  public worker: Worker | undefined = undefined;

  constructor() {}

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
  ): Promise<SharedArrayBuffer> {
    return this.execMap[name as unknown as string](args);
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
  private _wb: WorkerBridge<T> | undefined;
  private _workerString = "";

  constructor(instance: WorkerInstance<T>, config: InstanceConfiguration) {
    this._instance = instance;
    this._config = config;
    this._generate();
  }

  private _generate(): void {
    const keys = Reflect.ownKeys(
      Object.getPrototypeOf(this._instance),
    ) as [keyof T];
    const wrps: WorkerWrapper[] = [];
    for (const key of keys) {
      key !== "constructor" &&
        wrps.push(new WorkerWrapper(this._instance[key] as WorkerMethod));
    }

    this._wm = new WorkerManager(wrps);
    this._wb = new WorkerBridge({
      workers: wrps,
      namespace: this._config?.namespace as string,
    });

    let execFd = 'let workerState = "PENDING";';

    for (const addon of this._config?.addons ?? []) {
      const source = this._config.addonLoader
        ? this._config.addonLoader(addon)
        : "";
      execFd = execFd ? `${execFd}\n${source}` : source;
    }

    this._workerString = execFd;
  }

  /**
   * Create the web worker, adds an instance of a Worker object to the given class instance.
   * Current only supports the `onmessage` handler. but object may be accesed as the `worker` property
   */
  public async start(): Promise<void> {
    this?._wb?.bufferMap(this._instance);
    const ww = this?._wb?.workerWrappers(this._instance) ?? [];
    for (const w of ww) {
      (this._instance as WorkerDefinition).execMap[(w as any)._name] = w;
    }

    await this?._wb?.workerBootstrap(
      this._instance as T,
      this._workerString + "\n" + this?._wm?.CreateWorkerMap() + "\n" +
        this?._wm?.CreateOnMessageHandler() + "\n" +
        // tell the host we can start as this is done in the wasm instance wrapper
        // this will allow the promise being awaited to resolve by the caller.
        'postMessage({ready: true}); workerState = "READY";',
    );
  }

  /**
   * Regenerates the worker
   */
  public restart() {
    this?._wb?.workerBootstrap(
      this._instance as T,
      this?._wm?.CreateWorkerMap() + "\n" +
        this?._wm?.CreateOnMessageHandler() + "\n" +
        'postMessage({ready: true}); workerState = "READY";',
    );
  }

  /**
   * Creates the worker and bridging as generated output as `bridge` to a directory
   * the bootstrapping logic will load methods from the provided instance to the global object
   */
  public create(provider: DiskIOProvider): void {
    const byteEncoder = new TextEncoder();

    const worker = `${this._workerString}\n
      ${this?._wm?.CreateWorkerMap()}\n${this._wm?.CreateOnMessageHandler()}` +
      'self.postMessage({ready: true}); workerState = "READY"';

    provider.writeFileSync(
      `${this._config.outputPath}/bridge.js`,
      byteEncoder.encode(
        `${this?._wb?.createBridge(worker)}`,
      ),
    );
  }
}
