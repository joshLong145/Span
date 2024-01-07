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
            self.setInterval(() => {
              if (execData.length > 0 && workerState === "READY") {
                  const task = execData.shift();
                  let res = _execMap[task.name](task.buffer, task.args);
                  postMessage({
                      name: task.name,
                      buffer: task.buffer,
                      id: task.id,
                      res,
                      state: workerState,
                  })
              }
          }, 1)

          self.onmessage = (e) => {
            execData.push(e.data);
          };            
`;
  }
}
