import { InstanceWrapper, WorkerDefinition } from "../../src/mod.ts";

class KeyGenerator extends WorkerDefinition {
  constructor() {
    super();
  }

  getKeyPair = async (
    buffer: SharedArrayBuffer,
    _args: Record<string, any>,
  ): Promise<SharedArrayBuffer> => {
    await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
    );

    return buffer;
  };
}

async function parallelKeygenTest(opCount: number, workerCount: number) {
  const example = new KeyGenerator();
  const wrapper = new InstanceWrapper<KeyGenerator>(example, {
    workerCount: workerCount,
  });
  await wrapper.start();
  // Only measure time of execution. we Init shouldnt count ;)
  
  const promises = [];
  for (let i = 0; i < opCount; i++) {
    promises.push(example.execute("getKeyPair", {}));
  }

  await Promise.all(promises);
  example.terminateWorker();
}

async function syncKeygenTest(opCount: number) {
  for (let i = 0; i < opCount; i++) {
    await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
    );
  }
}

const opCount = parseInt(Deno.env.get("SPAN_HYPER_TEST_NUM_OPS") ?? "5", 10);
const workerCount = parseInt(
  Deno.env.get("SPAN_HYPER_TEST_WORKER_COUNT") ?? "5",
  10,
);

Deno.env.get("SPAN_HYPER_TEST") === "sync" && syncKeygenTest(opCount);
Deno.env.get("SPAN_HYPER_TEST") === "parallel" &&
  parallelKeygenTest(opCount, workerCount);
