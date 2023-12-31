//@ts-nocheck working out type problems

import {
  DiskIOProvider,
  InstanceConfiguration,
  WorkerInstance,
} from "./types.ts";
import { WorkerBridge } from "./WorkerBridge.ts";
import { WorkerManager } from "./WorkerManager.ts";
import { WorkerWrapper } from "./WorkerWrapper.ts";

export class WorkerDefinition {
  public execMap: Record<string, () => Promise<SharedArrayBuffer>> = {};
  public worker: Worker | undefined = undefined;

  constructor() {}

  public execute(
    name: string,
    args: Record<string, any> = {},
  ): Promise<SharedArrayBuffer> {
    return this.execMap[name](args);
  }

  public terminateWorker() {
    this.worker?.terminate();
  }
}

export class InstanceWrapper<T extends WorkerInstance> {
  private _config: InstanceConfiguration;
  private _instance: T;
  private _wm: WorkerManager | undefined;
  private _wb: WorkerBridge | undefined;

  constructor(instance: T, config: InstanceConfiguration) {
    this._instance = instance;
    this._config = config;
    this._generate();
  }

  private _generate(): void {
    const keys = Reflect.ownKeys(
      Object.getPrototypeOf(this._instance),
    ) as string[];
    const wrps: WorkerWrapper[] = [];
    for (const key of keys) {
      key !== "constructor" &&
        wrps.push(new WorkerWrapper(this._instance[key]));
    }

    this._wm = new WorkerManager(wrps);
    this._wb = new WorkerBridge({
      workers: wrps,
      namespace: this._config.namespace,
    });
  }

  public async start(): Promise<void> {
    this?._wb?.bufferMap(this._instance);
    const ww = this?._wb?.workerWrappers(this._instance) ?? [];
    for (const w of ww) {
      this._instance.execMap[(w as any)._name] = w;
    }

    await this?._wb?.workerBootstrap(
      this._instance,
      this?._wm?.CreateWorkerMap() + "\n" + this?._wm?.CreateOnMessageHandler(),
    );
  }

  public restart() {
    this?._wb?.workerBootstrap(
      this._instance,
      this?._wm?.CreateWorkerMap() + "\n" + this?._wm?.CreateOnMessageHandler(),
    );
  }

  public Create(provider: DiskIOProvider): void {
    const byteEncoder = new TextEncoder();
    provider.writeFileSync(
      "output/worker.js",
      byteEncoder.encode(
        `${this?._wm?.CreateWorkerMap()}\n${this._wm?.CreateOnMessageHandler()}`,
      ),
    );
    provider.writeFileSync(
      "output/bridge.js",
      byteEncoder.encode(`${this?._wb?.createBridge()}`),
    );
  }
}
