import { WorkerBridge } from "./WorkerBridge.ts";
import { WorkerManager } from "./WorkerManager.ts";
import { WorkerWrapper } from "./WorkerWrapper.ts";

export interface InstanceConfiguration {
    outputPath: string
}

export interface DiskIOProvider {
    writeFileSync: (path: string | URL, data: Uint8Array) => void
}

export class WorkerDefinition {
    public execMap: Record<string, Function> = {};
    public worker: Worker = undefined;
    constructor() {}

    public execute(name: string): Promise<SharedArrayBuffer> {
        return this.execMap[name]()
    }

    public terminateWorker() {
        this.worker.terminate();
    }
}

export class InstanceWrapper<T extends WorkerDefinition> {
    private _instance: T;
    private _config: InstanceConfiguration;

    private _wm: WorkerManager | undefined;
    private _wb: WorkerBridge | undefined;
    
    constructor(instance: T, config: InstanceConfiguration) {
        this._instance = instance;
        this._config = config;
        this._generate();
    }

    private _generate(): void {
        const keys = Reflect.ownKeys(Object.getPrototypeOf(this._instance))
        const wrps: WorkerWrapper[] = []
        for (const key of keys) {
            key !== "constructor" && wrps.push(new WorkerWrapper(this._instance[key]))
        }

        this._wm = new WorkerManager(wrps);
        this._wb = new WorkerBridge(wrps);
    }


    public start() {
        this?._wb?.bufferMap(this._instance);
        const ww = this?._wb?.workerWrappers(this._instance);
        for (const w of ww) {
            this._instance.execMap[(w as any)._name] = w
        }
        
        this?._wb?.workerBootstrap(this._instance, this?._wm?.CreateWorkerMap() + '\n' + this?._wm?.CreateOnMessageHandler());
    }

    public restart() {
        this?._wb?.workerBootstrap(this._instance, this?._wm?.CreateWorkerMap() + '\n' + this?._wm?.CreateOnMessageHandler());
    }

    public Create(provider: DiskIOProvider): void {
        const byteEncoder = new TextEncoder();
        provider.writeFileSync("output/worker.js",
            byteEncoder.encode(`${this?._wm?.CreateWorkerMap()}\n${this._wm?.CreateOnMessageHandler()}`)
        );
        provider.writeFileSync("output/bridge.js",
            byteEncoder.encode(`${this?._wb?.createBridge()}`)
        );
    }

}