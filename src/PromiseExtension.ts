import { Pool } from "./Pool.ts";
import { WorkerWrapper } from "./WorkerWrapper.ts";
import { WorkerDefinition } from "./mod.ts";
import { WorkerPromise, WorkerPromiseGeneratorNamed } from "./types.ts";

export function buildPromiseExtension(
  id: string,
  wrapper: WorkerWrapper,
  generator: WorkerPromiseGeneratorNamed,
  self: WorkerDefinition,
  pool: Pool,
  args: any = {},
): WorkerPromise {
  let promiseResolve, promiseReject;
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

  prms.args = args;
  prms.resolve = promiseResolve as any;
  prms.reject = promiseReject as any;
  prms.timerIds = [];
  prms.settledCount = 0;
  //@ts-ignore
  prms.buffer = self.bufferMap[wrapper.WorkerName ?? wrapper._name];
  prms.id = id;
  // @ts-ignore
  prms.name = wrapper.WorkerName ?? wrapper._name;
  prms.wrapper = generator;

  prms.timeout = (delay: number) => {
    const timerId = setTimeout(() => {
      const worker = self.pool?.findWorkerForId(id);
      if (!worker) {
        console.warn("could not find worker for task id: ", id);
      }

      worker?.worker.postMessage({
        name: `${wrapper.WorkerName}`,
        id: id,
        action: "TERM",
      });

      prms.reject(
        new Error("Timeout has occured, aborting worker execution"),
      );
    }, delay);

    prms.timerIds.push(timerId);
  };

  return prms;
}
