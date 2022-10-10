import { WorkerWrapper} from "./WorkerWrapper.ts";

export class WorkerManager {
    private _workers: WorkerWrapper[]

    constructor(workers: WorkerWrapper[]) {
        this._workers = workers;
    }

    public CreateWorkerMap(): string {
        var root: string = 'const _execMap = {\n'
        this._workers.forEach(worker => {
            root += `${worker.CreateExecMapping()}\n`
        });
        root += "}\n";
        return root
    }

    public CreateOnMessageHandler(): string {
        return `self.onmessage = (e) => {
            execData.push(e.data)
        }`;
    }
}