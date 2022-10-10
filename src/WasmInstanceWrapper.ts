import { InstanceConfiguration, WorkerDefinition } from "./InstanceWrapper.ts";
import { WorkerBridge } from "./WorkerBridge.ts";
import { WorkerManager } from "./WorkerManager.ts";
import { WorkerWrapper } from "./WorkerWrapper.ts";

export class WasmWorkerDefinition {
    public execMap: Record<string, Function> = {};
    public worker: Worker = undefined;
    public ModulePath: string;
    private workerString: string = "";

    constructor(modulePath: string) {
        this.ModulePath = modulePath;
    }

    public execute(name: string): Promise<SharedArrayBuffer> {
        return this.execMap[name]()
    }

    public terminateWorker() {
        this.worker.terminate();
    }
}

export class WasmInstanceWrapper<T extends WasmWorkerDefinition> {
    private _instance: T;
    private _config: InstanceConfiguration;

    private _wm: WorkerManager | undefined;
    private _wb: WorkerBridge | undefined;

    private _wasmModule: WebAssembly.WebAssemblyInstantiatedSource | undefined
    
    private mod: any

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
        const textEncoder = new TextEncoder();
        const textDecoder = new TextDecoder();
        let fd = Deno.openSync(this._instance.ModulePath)
        let module = Deno.readAllSync(fd)
        let execFd = Deno.readTextFileSync("./lib/wasm_exec.js")

        this.workerString = `
            ${execFd}

            let workerState = "PENDING";
            const execData = [];
            self['mod'] = new Go();
            var buffer = new ArrayBuffer(${module.length});
            var uint8 = new Uint8Array(buffer);

            self.setInterval(() => {
                console.log(execData.length)
                if (execData.length > 0 && workerState == "READY") {
                    const task = execData.shift()
                    let buff = _execMap[task.name](task.buffer, self['mod'])
                    postMessage({
                        name: task.name,
                        buffer: buff,
                        id: task.id
                    })
                }
            }, 10)

            uint8.set([
        `;
        for (let i = 0; i < module.length; i ++) {
            if (i == module.length - 1) {
                this.workerString += module[i]
                continue
            }
            this.workerString += module[i] + ',';
        }
        this.workerString += `
            ]);
            WebAssembly.instantiate(uint8, self['mod'].importObject).then((module) => {
                console.log("Done loading wasm module");
                workerState = "READY"
                self.mod.run(module.instance).then(() => {
                    console.log("Module has left scope");
                })
            });
        `;
    }
    public start() {
        this?._wb?.bufferMap(this._instance);
        const ww = this?._wb?.workerWrappers(this._instance);
        for (const w of ww) {
            this._instance.execMap[(w as any)._name] = w
        }
        
        this?._wb?.workerBootstrap(this._instance, this.workerString + '\n' + this?._wm?.CreateWorkerMap() + '\n' + this?._wm?.CreateOnMessageHandler());
    }

    
}