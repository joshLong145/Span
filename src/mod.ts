import { InstanceWrapper, WorkerDefinition } from "./InstanceWrapper.ts";
import { InstanceConfiguration } from "./types.ts";

export async function wrap<T extends WorkerDefinition>(
  wrapper: T,
  options: InstanceConfiguration | undefined
): Promise<InstanceWrapper<T>> {
  const instance = new InstanceWrapper<T>(wrapper, options ?? {});
  await instance.start().catch((e: unknown) => {
    console.log("failed to start instance: ", e as Error);
    throw e;
  });
  return instance;
}

export { InstanceWrapper, WorkerDefinition };
export * from "./types.ts";
