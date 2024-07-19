import { InstanceWrapper, WorkerDefinition } from "../src/mod.ts";

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

Deno.bench("parallel key generation", async (b) => {
  const example = new KeyGenerator();
  const wrapper = new InstanceWrapper<KeyGenerator>(example, {});
  await wrapper.start();
  // Only measure time of execution. we Init shouldnt count ;)
  b.start();
  for (let i = 0; i < 5; i++) {
    example.execute("getKeyPair");
  }

  while (
    example.pool?.getThreadStates().find((s) => s.tasks.length > 0)
  ) {
    await new Promise((res) => setTimeout(res, 100));
  }
  b.end();

  example.terminateWorker();
});

Deno.bench("sync key generation", async () => {
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
});
