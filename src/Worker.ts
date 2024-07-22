// deno-lint-ignore-file no-explicit-any
export class WorkerHandler {
  private sourceDef: string;
  private _args: any;

  public _executionMap: Record<string, any> = {};
  public worker: any;
  public state: string = "BUSY";

  constructor(source: string, args: any) {
    this._args = args;
    this.sourceDef = source;

    const blob = new Blob(
      [source],
      { type: "application/typescript" },
    );

    this.worker = new Worker(URL.createObjectURL(blob), {
      //@ts-ignore: deno flag
      deno: globalThis.Deno ? true : false,
      type: "module",
    });

    this.worker.onmessage = (e: MessageEvent<any>) => {
      if (e.data.ready) {
        this.state = "IDLE";
        return;
      }

      if (!this._executionMap[e.data.id]) {
        return;
      }

      const context = this._executionMap[e.data.id];

      if (e.data.error) {
        context.promise &&
          context.reject(new Error("Error occured in worker: " + e.data.error));
      } else {
        context.promise && context.resolve(e.data.buffer);
        this._executionMap[e.data.id].buffer = e.data.buffer;
      }

      delete this._executionMap[e.data.id];

      if (Object.keys(this._executionMap).length === 0) {
        this.state = "IDLE";
      } else {
        this.state = "BUSY";
      }
    };
  }

  public isReady(): boolean {
    return this.state === "IDLE" || Object.keys(this._executionMap).length < 1;
  }
}
