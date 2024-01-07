import {
  DiskIOProvider,
  InstanceConfiguration,
  WorkerInstance,
} from "./types.ts";
import { WorkerBridge } from "./WorkerBridge.ts";
import { WorkerManager } from "./WorkerManager.ts";
import { WorkerMethod, WorkerWrapper } from "./WorkerWrapper.ts";

export class WorkerDefinition {
  public execMap: Record<
    string,
    (args: Record<string, any>) => Promise<SharedArrayBuffer>
  > = {};
  public worker: Worker | undefined = undefined;

  constructor() {}

  public execute(
    name: keyof this,
    args: Record<string, any> = {},
  ): Promise<SharedArrayBuffer> {
    return this.execMap[name as unknown as string](args);
  }

  public terminateWorker() {
    this.worker?.terminate();
  }
}

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

  public restart() {
    this?._wb?.workerBootstrap(
      this._instance as T,
      this?._wm?.CreateWorkerMap() + "\n" +
        this?._wm?.CreateOnMessageHandler() + "\n" +
        'postMessage({ready: true}); workerState = "READY";',
    );
  }

  public create(provider: DiskIOProvider): void {
    const byteEncoder = new TextEncoder();

    const worker =
      `${this?._wm?.CreateWorkerMap()}\n${this._wm?.CreateOnMessageHandler()}`;

    provider.writeFileSync(
      `${this._config.outputPath}/bridge.js`,
      byteEncoder.encode(`${this?._wb?.createBridge(worker)}`),
    );
  }
}
