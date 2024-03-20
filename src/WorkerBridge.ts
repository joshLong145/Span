import { WorkerWrapper } from "./WorkerWrapper.ts";
import { WorkerDefinition } from "./mod.ts";
import { WorkerInstance } from "./types.ts";
import {
  WorkerPromiseGenerator,
  WorkerPromiseGeneratorNamed,
} from "./types.ts";
import { WorkerPromise } from "./types.ts";

export interface BridgeConfiguration {
  namespace: string;
  workers: WorkerWrapper[];
  modulePath: string;
}

export class WorkerBridge {
  private _workers;
  private _namespace;

  constructor(config: BridgeConfiguration) {
    this._workers = config.workers;
    this._namespace = config.namespace;
  }

  public bufferMap(self: WorkerDefinition): void {
    for (const worker of this._workers) {
      // this should be a config option
      (self as WorkerDefinition).bufferMap[`${worker.WorkerName}`] =
        new SharedArrayBuffer(1024);
    }
  }

  private _bufferMap(): string {
    let root = `
        const _bufferMap = {}
        `;

    for (const worker of this._workers) {
      root += `
// this buffer size should be a config option, 
_bufferMap["${worker.WorkerName}"] = typeof SharedArrayBuffer != "undefined" ? new SharedArrayBuffer(1024) : new Uint8Array();\n
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
  public async workerBootstrap(
    self: WorkerDefinition,
    bridgeStr: string,
  ): Promise<void> {
    self._executionMap = {};
    const workerBuff = bridgeStr;
    const blob = new Blob(
      [workerBuff],
      { type: "application/typescript" },
    );
    const objUrl = URL.createObjectURL(blob);

    let prmsRes: (value: void) => void;
    const moduleWait = new Promise<void>((res, _rej) => {
      prmsRes = res;
    });

    self.worker = this._genWebWorker(objUrl);
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

  private _workerBootstrap(worker: string): string {
    let workerBuff = new TextEncoder().encode(worker);
    let workerArr = [];
    for (let i = 0; i < workerBuff.length; i++) {
      workerArr[i] = workerBuff[i];
    }

    return `
let workerStr = [${workerArr.toString()}]
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}
const _executionMap = {}
let worker;
let prmsRes;
let moduleWait = new Promise((res, rej) => {
  prmsRes = res;
});

const blob = new Blob([new TextDecoder().decode(new Uint8Array(workerStr))],{ type: "application/typescript" });
const objUrl = URL.createObjectURL(blob);            
worker = new Worker(objUrl, {type: "module"});

worker.onmessage = function(e) {
  if (e.data.ready) {
    prmsRes();
  }
  if(!_executionMap[e.data.id]) {
      return
  }
  const context = _executionMap[e.data.id]
  context.promise && context.resolve(e.data.res)
  delete _executionMap[e.data.id]
}`;
  }

  public workerWrappers(self: WorkerDefinition): WorkerPromiseGeneratorNamed[] {
    const workerWrappers: WorkerPromiseGeneratorNamed[] = [];
    for (const worker of this._workers) {
      const def: WorkerPromiseGeneratorNamed = function (args = {}) {
        let promiseResolve, promiseReject;
        const id = self.uuidv4();
        //@ts-ignore building object
        const prms: WorkerPromise = new Promise<SharedArrayBuffer>(
          (resolve, reject) => {
            promiseResolve = resolve;
            promiseReject = reject;
          },
        ).finally(() => {
          for (let i = 0; i < prms.timerIds.length; i++) {
            clearTimeout(prms.timerIds[i]);
          }
          prms.settledCount += 1;
        });

        prms.resolve = promiseResolve as any;
        prms.reject = promiseReject as any;
        prms.timerIds = [];
        prms.settledCount = 0;
        prms.name = worker.WorkerName;
        prms.wrapper = def;
        prms.timeout = (delay: number) => {
          const timerId = setTimeout(() => {
            self.worker.postMessage({
              name: `${worker.WorkerName}`,
              id: id,
              action: "TERM",
            });

            prms.reject(
              new Error("Timeout has occured, aborting worker execution"),
            );
          }, delay);

          prms.timerIds.push(timerId);
        };

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

        return prms as WorkerPromise;
      };

      def._name = worker.WorkerName;
      workerWrappers.push(def);
    }

    return workerWrappers;
  }

  private _workerWrappers(): string {
    let root = `const ${this._namespace} = {`;

    for (const worker of this._workers) {
      root += `
"${worker.WorkerName}": async function ${worker.WorkerName}(args) {
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
  },\n
`;
    }

    root += "}";
    root += `
for (const key of Object.keys(${this._namespace ?? "span"})) {
  self["${this._namespace ?? "span"}"] =  self["${
      this._namespace ?? "span"
    }"] != undefined ? self["${this._namespace ?? "span"}"] : {};
  self["${this._namespace ?? "span"}." + key] = ${
      this._namespace ?? "span"
    }[key];
  console.log("bootstrapping methods to global namespace:", self["${
      this._namespace ?? "span"
    }." + key]);
  self[key] = ${this._namespace ?? "span"}[key];
  
}
self['worker'] = worker;
`;
    return root;
  }

  private _genWebWorker(objUrl: string): any {
    //@ts-ignore deno module true
    const worker = new Worker(objUrl, { deno: true, type: "module" });

    return worker;
  }

  public createBridge(worker: string): string {
    const bufferAlloc = this._bufferMap();
    const bootstrap = this._workerBootstrap(worker);
    const wrappers = this._workerWrappers();
    return `${bufferAlloc}\n${bootstrap}\n${wrappers}`;
  }

  public createWorkerMap(): string {
    const bufferAlloc = this._bufferMap();
    const wrappers = this._workerWrappers();
    return `${bufferAlloc}\n${wrappers}`;
  }
}
