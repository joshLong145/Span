import { WorkerWrapper } from "./WorkerWrapper.ts";

export class WorkerBridge {
    private _workers: WorkerWrapper[]

    constructor(workers: WorkerWrapper[]){
        this._workers = workers;
    }

    public bufferMap(self: any): void  {
        self.bufferMap = {}
        for (const worker of this._workers) {
            self.bufferMap[`${worker.WorkerName}`] = new SharedArrayBuffer(1024);
        }
    }

    private _bufferMap(): string {
        
        let root =  `
        const _bufferMap = {}
        `;

        for (const worker of this._workers) {
            root += `
            _bufferMap["${worker.WorkerName}"] = new SharedArrayBuffer(1024);\n
            `;
        }

        return root;
    }

    //@ts-ignore
    public workerBootstrap(self, bridgeStr) {
        self.uuidv4 = () => {
            // @ts-ignore
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        }
        
        self._executionMap = {};
        const workerBuff = bridgeStr;
        const blob = new Blob(
            [workerBuff],
            {type: 'application/typescript'},
        );
        const objUrl = URL.createObjectURL(blob);  
        //@ts-ignore                
        self.worker = new Worker(objUrl, {deno: true, type: "module"});
        self.worker.onmessage = (e: any) => {
            if(!self._executionMap[e.data.id]) {
                return
            }
            const context = self._executionMap[e.data.id]
            context.promise && context.resolve(e.data.buffer)
            delete self._executionMap[e.data.id]
        }
    }

    
    private _workerBootstrap(): string {
        return `
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}
const _executionMap = {}
let worker;
const workerBuff = fetch("worker.js").then( async (resp) => {
    const blob = await resp.blob();
    const objUrl = URL.createObjectURL(blob);            
    worker = new Worker(objUrl, {type: "module"});
    worker.onmessage = function(e) {
        if(!_executionMap[e.data.id]) {
            return
        }
        const context = _executionMap[e.data.id]
        context.promise && context.resolve(e.data.res)
        delete _executionMap[e.data.id]
    }
});
        `;
    }
    
    public workerWrappers(self: any) {
        let ww: any = [];
        for (const worker of this._workers) {
            let def = async function() {
                let promiseResolve, promiseReject;
                const id = self.uuidv4()
                const prms = new Promise<SharedArrayBuffer>((resolve, reject) => {
                    promiseResolve = resolve
                    promiseReject = reject
                });
                self._executionMap[id] = {
                    promise: prms,
                    resolve: promiseResolve,
                    reject: promiseReject
                }
                self.worker.postMessage({
                    name: `${worker.WorkerName}`,
                    id: id,
                    buffer: self.bufferMap[`${worker.WorkerName}`],
                })
                return prms
            }
            //@ts-ignore
            def._name = worker.WorkerName;
            ww.push(def);
        }

        return ww
    }

    private _workerWrappers(): string {
        let root = '';

        for (const worker of this._workers) {

            root += `async function ${worker.WorkerName}(args) {
                let promiseResolve, promiseReject;
                const id = uuidv4()
                const prms = new Promise((resolve, reject) => {
                    promiseResolve = resolve
                    promiseReject = reject
                });
                _executionMap[id] = {
                    promise: prms,
                    resolve: promiseResolve,
                    reject: promiseReject,
                }
                worker.postMessage({
                    name: "${worker.WorkerName}",
                    id: id,
                    buffer: _bufferMap["${worker.WorkerName}"],
                    args
                })
                return prms;
            }\n`;
        }
        return root;
    }

    public createBridge(): string {
        const bufferAlloc = this._bufferMap();
        const bootstrap = this._workerBootstrap();
        const wrappers = this._workerWrappers();
        return `${bufferAlloc}\n${bootstrap}\n${wrappers}`
    }

    public createWorkerMap(): string {
        const bufferAlloc = this._bufferMap();
        const wrappers = this._workerWrappers();
        return `${bufferAlloc}\n${wrappers}`
    }
};