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

async function parallelKeygenTest() {
  const example = new KeyGenerator();
  const wrapper = new InstanceWrapper<KeyGenerator>(example, {workerCount: 5});
  await wrapper.start();
  // Only measure time of execution. we Init shouldnt count ;)

  for (let i = 0; i < 5; i++) {
    example.execute("getKeyPair");
  }

  while (
    example.pool?.getThreadStates().find((s) => s.tasks.length > 0)
  ) {
    await new Promise((res) => setTimeout(res, 1));
  }
  
  example.terminateWorker();
}


async function syncKeygenTest() {
  for (let i = 0; i < 5; i++) {
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



Deno.env.get("SPAN_HYPER_TEST") === "sync" && syncKeygenTest();
Deno.env.get("SPAN_HYPER_TEST") === "parallel" && parallelKeygenTest();