import { WorkerWrapper } from "./WorkerWrapper.ts";

export class WorkerManager {
  private _workers: WorkerWrapper[];

  constructor(workers: WorkerWrapper[]) {
    this._workers = workers;
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
            if (execData.length > 0 && workerState === "READY") {
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
                      state: workerState,
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
