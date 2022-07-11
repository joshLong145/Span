import { WorkerWrapper } from "./WorkerWrapper.ts";

export class WorkerBridge {
    private _workers: WorkerWrapper[]

    constructor(workers: WorkerWrapper[]){
        this._workers = workers;
    }

    private _bufferMap(): string {
        
        let root =  `
        const _bufferMap = {}
        `;

        for (const worker of this._workers) {
            root += `
            _bufferMap["${worker.WorkerName}"] = new SharedArrayBuffer(1024);\n
            `
        }

        return root;
    }

    private _workerBootstrap(): string {
        return `
                function uuidv4() {
                    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                    (crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
                    );
                }
                const _executionMap = {}
                const workerBuff = Deno.readFileSync("./output/worker.js");
                const source = new TextDecoder().decode(workerBuff);
                const blob = new Blob(
                    [source],
                    {type: 'application/typescript'},
                );
                const objUrl = URL.createObjectURL(blob);                  
                const worker = new Worker(objUrl, {deno: true, type: "module"});
                worker.onmessage = function(e) {
                    if(!_executionMap[e.data.id]) {
                        return
                    }
                    const context = _executionMap[e.data.id]
                    context.promise && context.resolve()
                    delete _executionMap[e.data.id]
                }
        `;
    }

    private _workerWrappers(): string {
        let root = '';
        for (const worker of this._workers) {
            root += `export async function ${worker.WorkerName}() {
                let promiseResolve, promiseReject;
                const id = uuidv4()
                const prms = new Promise((resolve, reject) => {
                    promiseResolve = resolve
                    promiseReject = reject
                });
                _executionMap[id] = {
                    promise: prms,
                    resolve: promiseResolve,
                    reject: promiseReject
                }
                worker.postMessage({
                    name: "${worker.WorkerName}",
                    id: id,
                    buffer: _bufferMap["${worker.WorkerName}"],
                })
                await prms
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

};