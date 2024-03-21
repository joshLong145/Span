import { WorkerWrapper } from "./WorkerWrapper.ts";

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
const execData = [];
const tasks = {};
self.setInterval(async () => {
  if (execData.length > 0 && ${
      this._namespace != "" ? this._namespace : "span"
    }.workerState === "READY") {
    const task = execData.shift();
    if (task.action === 'TERM') {
      tasks[task.id].reject();
      delete tasks[task.id];
    } else {
      let res, rej;
      tasks[task.id] = new Promise<void>((resolve, reject) => {
        res = resolve;
        rej = reject;
        try {
          let res = _execMap[task.name](task.buffer, task.args);
          if (res.then) {
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
              delete tasks[task.id];
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
              delete tasks[task.id];
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
          delete tasks[task.id];                
        }
      });

      tasks[task.id].resolve = res;
      tasks[task.id].reject = rej;
      tasks[task.id].catch((err) => {
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
  execData.push(e.data);
};
`;
  }
}
