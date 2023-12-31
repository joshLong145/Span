//@ts-nocheck working out type issues

import { reset } from "https://deno.land/std@0.210.0/fmt/colors.ts";
import { WorkerWrapper } from "./WorkerWrapper.ts";

export interface BridgeConfiguration {
  namespace: string;
  workers: WorkerWrapper[];
}

export class WorkerBridge<T> {
  private _workers;
  private _namespace;

  constructor(config: BridgeConfiguration) {
    this._workers = config.workers;
    this._namespace = config.namespace;
  }

  public bufferMap(self: any): void {
    self.bufferMap = {};
    for (const worker of this._workers) {
      // this should be a config option
      self.bufferMap[`${worker.WorkerName}`] = new SharedArrayBuffer(1024);
    }
  }

  private _bufferMap(): string {
    let root = `
        const _bufferMap = {}
        `;

    for (const worker of this._workers) {
      root += `
            // this buffer size should be a config option, 
            _bufferMap["${worker.WorkerName}"] = new SharedArrayBuffer(1024);\n
            `;
    }

    return root;
  }

  /**
   * MAKE THIS INTO AN ASYNC FUNCTION WAITING ON THE READY state of the worker for standup to continue
   *
   * @param self
   * @param bridgeStr
   */
  public async workerBootstrap(self: T, bridgeStr: string): Promise<void> {
    self.uuidv4 = () => {
      return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(
        /[018]/g,
        (c) =>
          (crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(
            16,
          ),
      );
    };

    self._executionMap = {};
    const workerBuff = bridgeStr;
    const blob = new Blob(
      [workerBuff],
      { type: "application/typescript" },
    );
    const objUrl = URL.createObjectURL(blob);

    let prmsRes;
    let moduleWait = new Promise<void>((res, rej) => {
      prmsRes = res;
    });

    self.worker = new Worker(objUrl, { deno: true, type: "module" });
    self.worker.onmessage = (e: MessageEvent<any>) => {
      if (e.data.ready) {
        prmsRes();
      }
      if (!self._executionMap[e.data.id]) {
        return;
      }
      const context = self._executionMap[e.data.id];
      context.promise && context.resolve(e.data.buffer);
      delete self._executionMap[e.data.id];
    };

    return moduleWait;
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
let workerState;
const workerBuff = fetch("worker.js").then( async (resp) => {
    const blob = await resp.blob();
    const objUrl = URL.createObjectURL(blob);            
    worker = new Worker(objUrl, {type: "module"}

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
    const workerWrappers: any[] = [];
    for (const worker of this._workers) {
      const def = function (args = {}) {
        let promiseResolve, promiseReject;
        const id = self.uuidv4();
        const prms = new Promise<SharedArrayBuffer>((resolve, reject) => {
          promiseResolve = resolve;
          promiseReject = reject;
        });
        self._executionMap[id] = {
          promise: prms,
          resolve: promiseResolve,
          reject: promiseReject,
        };
        self.worker.postMessage({
          name: `${worker.WorkerName}`,
          id: id,
          buffer: self.bufferMap[`${worker.WorkerName}`],
          args,
        });
        return prms;
      };

      //@ts-ignore
      def._name = worker.WorkerName;
      workerWrappers.push(def);
    }

    return workerWrappers;
  }

  private _workerWrappers(): string {
    let root = `const ${this._namespace} = {`;

    for (const worker of this._workers) {
      root +=
        `"${worker.WorkerName}": async function ${worker.WorkerName}(args) {
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
            },\n`;
    }

    root += "}";
    return root;
  }

  public createBridge(): string {
    const bufferAlloc = this._bufferMap();
    const bootstrap = this._workerBootstrap();
    const wrappers = this._workerWrappers();
    return `${bufferAlloc}\n${bootstrap}\n${wrappers}`;
  }

  public createWorkerMap(): string {
    const bufferAlloc = this._bufferMap();
    const wrappers = this._workerWrappers();
    return `${bufferAlloc}\n${wrappers}`;
  }
}
