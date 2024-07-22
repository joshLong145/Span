import type { WorkerWrapper } from "./WorkerWrapper.ts";

export class WorkerManager {
  private _workers: WorkerWrapper[];
  private _namespace: string | undefined;

  constructor(workers: WorkerWrapper[], namespace: string) {
    this._workers = workers;
    this._namespace = namespace;
  }

  public CreateWorkerMap(): string {
    let root = "const _execMap = {\n";
    this._workers.forEach((worker) => {
      root += `${worker.CreateExecMapping()}\n`;
    });
    root += "}\n";
    return root;
  }

  public CreateOnMessageHandler(): string {
    return `
${this._namespace != "" ? this._namespace : "span"}.execData = [];
${this._namespace != "" ? this._namespace : "span"}.tasks = {};
self.setInterval(async () => {
  if (${
      this._namespace != "" ? this._namespace : "span"
    }.execData.length > 0 && ${
      this._namespace != "" ? this._namespace : "span"
    }.workerState === "READY") {
    const task = ${
      this._namespace != "" ? this._namespace : "span"
    }.execData.shift();
    if (task.action === 'TERM') {
      ${
      this._namespace != "" ? this._namespace : "span"
    }.tasks[task.id].reject();
      delete ${this._namespace != "" ? this._namespace : "span"}.tasks[task.id];
    } else {
      let res, rej;
      ${
      this._namespace != "" ? this._namespace : "span"
    }.tasks[task.id] = new Promise<void>((resolve, reject) => {
        res = resolve;
        rej = reject;
        try {
          let res = _execMap[task.name](task.buffer, task.args);
          if (res && res.then) {
            let retVal;
            res.then((val) => {
              retVal = val;
              resolve();
              postMessage({
                name: task.name,
                buffer: task.buffer,
                id: task.id,
                state: ${
      this._namespace != "" ? this._namespace : "span"
    }.workerState,
                res: retVal
              });
            }).catch((err) => {
              reject();
              postMessage({
                name: task.name,
                buffer: task.buffer,
                id: task.id,
                error: err.toString(),
                state: ${
      this._namespace != "" ? this._namespace : "span"
    }.workerState,
              });
            }).finally(() => {
              delete ${
      this._namespace != "" ? this._namespace : "span"
    }.tasks[task.id];
            });
          } else {
            postMessage({
              name: task.name,
              buffer: task.buffer,
              id: task.id,
              state: ${
      this._namespace != "" ? this._namespace : "span"
    }.workerState,
              res
            });
            delete ${
      this._namespace != "" ? this._namespace : "span"
    }.tasks[task.id];
          }
        } catch(e) {
          postMessage({
            name: task.name,
            buffer: task.buffer,
            id: task.id,
            error: e.toString(),
            state: ${
      this._namespace != "" ? this._namespace : "span"
    }.workerState
          });
          delete ${
      this._namespace != "" ? this._namespace : "span"
    }.tasks[task.id];                
        }
      });

      ${
      this._namespace != "" ? this._namespace : "span"
    }.tasks[task.id].resolve = res;
      ${
      this._namespace != "" ? this._namespace : "span"
    }.tasks[task.id].reject = rej;
      ${
      this._namespace != "" ? this._namespace : "span"
    }.tasks[task.id].catch((err) => {
        err && postMessage({
          name: task.name,
          buffer: task.buffer,
          id: task.id,
          state: ${this._namespace != "" ? this._namespace : "span"}.workerState
        });           
      });
    }
  }
}, 1);

self.onmessage = (e) => {
  ${this._namespace != "" ? this._namespace : "span"}.execData.push(e.data);
};
`;
  }
}
