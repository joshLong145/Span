import { InstanceConfiguration, WorkerDefinition } from "./InstanceWrapper.ts";
import { WorkerBridge } from "./WorkerBridge.ts";
import { WorkerManager } from "./WorkerManager.ts";
import { WorkerWrapper } from "./WorkerWrapper.ts";

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

    
}