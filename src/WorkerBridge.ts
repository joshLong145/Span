import type { WorkerWrapper } from "./WorkerWrapper.ts";
import type { WorkerDefinition } from "./mod.ts";
import { buildPromiseExtension, TaskPromise } from "./PromiseExtension.ts";
import { Pool } from "./Pool.ts";

import type { PoolArgs, WorkerPromiseGeneratorNamed } from "./types.ts";
import { WorkerHandler } from "./Worker.ts";
import { STATES } from "./constants.ts";

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
    this._namespace = config.namespace ?? "span";
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
    poolArgs: PoolArgs = { workerCount: 5 },
  ): Promise<void> {
    const pool = new Pool(poolArgs);
    self.pool = pool;

    await pool.init(bridgeStr);
  }

  private _workerBootstrap(worker: string): string {
    const workerBuff = new TextEncoder().encode(worker);
    const workerArr: number[] = [];
    for (let i = 0; i < workerBuff.length; i++) {
      workerArr[i] = workerBuff[i];
    }

    return `
const STATES = ${JSON.stringify(STATES)};
${Pool.toString()}
${TaskPromise.toString()}
${WorkerHandler.toString()}
let workerStr = [${workerArr.toString()}];         
const pool = new Pool({workerCount: 5});
await pool.init(new TextDecoder().decode(new Uint8Array(workerStr)));
`;
  }

  public workerWrappers(self: WorkerDefinition): WorkerPromiseGeneratorNamed[] {
    const workerWrappers: WorkerPromiseGeneratorNamed[] = [];
    for (const worker of this._workers) {
      const def: WorkerPromiseGeneratorNamed = function (args = {}) {
        const id = Pool.uuidv4();
        const prms: TaskPromise = buildPromiseExtension(
          id as string,
          worker,
          def,
          self,
          self?.pool!,
          args,
        );

        self.pool?.exec(prms);

        return prms;
      };

      def._name = worker.WorkerName;
      workerWrappers.push(def);
    }

    return workerWrappers;
  }

  private _workerWrappers(): string {
    let root = `
const ${this._namespace} = {

`;

    for (const worker of this._workers) {
      root += `
"${worker.WorkerName}": function ${worker.WorkerName}(args) {
     const id = Pool.uuidv4();
    const prms = buildPromiseExtension(id, {_name: "${worker.WorkerName}"}, ${this._namespace}["${worker.WorkerName}"], {bufferMap: _bufferMap}, pool, args);
    pool.exec(prms);
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
  self[key] = ${this._namespace ?? "span"}[key];
  
}
self['pool'] = pool;
`;

    root += `\n` + buildPromiseExtension.toString();
    return root;
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
