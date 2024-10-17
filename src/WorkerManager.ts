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
const namespace = ${this._namespace != "" ? this._namespace : "span"};

self.setInterval(async () => {
  if (namespace.execData.length > 0 && namespace.workerState === "READY") {
    const task = namespace.execData.shift();
    if (task.action === 'TERM') {
      namespace.tasks[task.id].reject(new Error("Worker terminating"));
      delete namespace.tasks[task.id];
      postMessage({
      action: "TERM",
      id: task.id,
      });
    } else {
      let res, rej;
      namespace.tasks[task.id] = new Promise<void>((resolve, reject) => {
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
                state: namespace.workerState,
                res: retVal
              });
            }).catch((err) => {
              reject();
              postMessage({
                name: task.name,
                buffer: task.buffer,
                id: task.id,
                error: err.toString(),
                state: namespace.workerState,
              });
            }).finally(() => {
              delete namespace.tasks[task.id];
            });
          } else {
            postMessage({
              name: task.name,
              buffer: task.buffer,
              id: task.id,
              state: namespace.workerState,
              res
            });
            delete namespace.tasks[task.id];
          }
        } catch(e) {
          postMessage({
            name: task.name,
            buffer: task.buffer,
            id: task.id,
            error: e.toString(),
            state: namespace.workerState
          });
          delete namespace.tasks[task.id];                
        }
      });

      namespace.tasks[task.id].resolve = res;
      namespace.tasks[task.id].reject = rej;
      namespace.tasks[task.id].catch((err) => {
      err && postMessage({
          name: task.name,
          buffer: task.buffer,
          id: task.id,
          state: namespace.workerState
        });           
      });
    }
  }
}, 1);

self.onmessage = (e) => {
  namespace.execData.push(e.data);
};
`;
  }
}
