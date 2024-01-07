import {
  DiskIOProvider,
  InstanceConfiguration,
  WasmWorkerInstance,
} from "./types.ts";
import { WorkerBridge } from "./WorkerBridge.ts";
import { WorkerManager } from "./WorkerManager.ts";
import { WorkerMethod, WorkerWrapper } from "./WorkerWrapper.ts";

export class WasmWorkerDefinition {
  public execMap: Record<
    string,
    (options?: Record<string, any>) => Promise<SharedArrayBuffer>
  > = {};
  public worker: Worker | undefined = undefined;
  public ModulePath: string;
  private workerString = "";

  constructor(modulePath: string) {
    this.ModulePath = modulePath;
  }

  public execute(name: keyof this, options?: any): Promise<SharedArrayBuffer> {
    return this.execMap[name as unknown as string](options);
  }

  public terminateWorker() {
    this.worker?.terminate();
  }
}

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
   * Creates
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

  public create(provider: DiskIOProvider): void {
    if (!this._config.outputPath) {
      throw new Error(
        "No output path provided in configuration, aborting generation",
      );
    }

    this._generate();

    const enc = new TextEncoder();
    provider.writeFileSync(
      this._config.outputPath + "/worker.js",
      enc.encode(`
${this.workerString}\n
${this?._wm?.CreateWorkerMap()}\n
            `),
    );
    provider.writeFileSync(
      this._config.outputPath + "/bridge.js",
      enc.encode(`${this?._wb?.createBridge()}`),
    );
  }

  public restart() {
    this?._wb?.workerBootstrap(
      this._instance as T,
      this.workerString + "\n" + this?._wm?.CreateWorkerMap() + "\n" +
        this?._wm?.CreateOnMessageHandler(),
    );
  }
}
