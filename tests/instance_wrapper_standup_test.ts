import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.210.0/assert/mod.ts";
import { InstanceWrapper, WorkerDefinition } from "../src/mod.ts";

class TestExample extends WorkerDefinition {
  public constructor() {
    super();
  }

  foo = (
    buffer: SharedArrayBuffer,
    module: Record<string, any>,
  ): SharedArrayBuffer => {
    let arr = new Uint8Array(buffer);
    arr[0] += 1;
    return buffer;
  };
}

Deno.test("Worker Wrapper should be defined", () => {
  const inst = new TestExample();
  const wrapper = new InstanceWrapper<TestExample>(inst, { workerCount: 5 });
  assertEquals(wrapper["_config"], { workerCount: 5 });
  assertEquals(inst, wrapper["_instance"]);
});

Deno.test("Worker Wrapper manager should be defined when started", () => {
  const inst = new TestExample();
  const wrapper = new InstanceWrapper<TestExample>(inst, { workerCount: 1 });
  wrapper.start();
  inst.terminateWorker();
  assertExists(wrapper["_wm"]);
  assertExists(wrapper["_wb"]);
});

Deno.test("Worker Wrapper manager should be defined when started", () => {
  const inst = new TestExample();
  const wrapper = new InstanceWrapper<TestExample>(inst, { workerCount: 1 });
  wrapper.start();
  inst.terminateWorker();
  //@ts-ignore is defined
  assertEquals(wrapper["_wm"]["_workers"].length, 1);
});
