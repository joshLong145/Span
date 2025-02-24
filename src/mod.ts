import { InstanceWrapper, WorkerDefinition } from "./InstanceWrapper.ts";

export async function wrap<T extends WorkerDefinition>(
  wrapper: T,
): Promise<InstanceWrapper<T>> {
  const instance = new InstanceWrapper<T>(wrapper, {});
  await instance.start().catch((e: unknown) => {
    console.log("failed to start instance: ", e as Error);
    throw e;
  });
  return instance;
}

export { InstanceWrapper, WorkerDefinition };
export * from "./types.ts";
