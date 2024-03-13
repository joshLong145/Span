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
    return `const execData = [];
            self.setInterval(async () => {
            if (execData.length > 0 && ${
      this._namespace != "" ? this._namespace : "span"
    }.workerState === "READY") {
                try {
                  const task = execData.shift();
                  let res = _execMap[task.name](task.buffer, task.args);
                  if (res.then) {
                    res = await res;
                  }

                  postMessage({
                      name: task.name,
                      buffer: task.buffer,
                      id: task.id,
                      state: ${
      this._namespace != "" ? this._namespace : "span"
    }.workerState,
                      res
                  });
                } catch(e) {
                  console.error('Error while executing task. Error trace:' + e.message);
                }
            }
          }, 1);

          self.onmessage = (e) => {
            execData.push(e.data);
          };
`;
  }
}
