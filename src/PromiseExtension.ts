import { WorkerWrapper } from "./WorkerWrapper.ts";
import { WorkerDefinition } from "./mod.ts";
import { WorkerPromise, WorkerPromiseGeneratorNamed } from "./types.ts";

export function buildPromiseExtension(
  id: string,
  wrapper: WorkerWrapper,
  generator: WorkerPromiseGeneratorNamed,
  self: WorkerDefinition,
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

  prms.resolve = promiseResolve as any;
  prms.reject = promiseReject as any;
  prms.timerIds = [];
  prms.settledCount = 0;
  prms.name = name;
  prms.wrapper = generator;
  prms.timeout = (delay: number) => {
    const timerId = setTimeout(() => {
      self.worker.postMessage({
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
