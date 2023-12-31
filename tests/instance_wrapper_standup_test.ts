//@ts-nocheck come back

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.210.0/assert/mod.ts";
import { InstanceWrapper, WorkerDefinition } from "../src/mod.ts";

class TestExample extends WorkerDefinition {
  public constructor() {
    super();
  }

  public foo(
    buffer: SharedArrayBuffer,
    args: Record<string, any>,
  ): ArrayBuffer {
    buffer[0] += 1;
    console.log(buffer[0]);
  }
}

Deno.test("Worker Wrapper should be defined", () => {
  const inst = new TestExample();
  const wrapper = new InstanceWrapper<TestExample>(inst, {});
  assertEquals(wrapper["_config"], {});
  assertEquals(inst, wrapper["_instance"]);
});

Deno.test("Worker Wrapper manager should be defined when started", () => {
  const inst = new TestExample();
  const wrapper = new InstanceWrapper<TestExample>(inst, {});
  wrapper.start();
  inst.terminateWorker();
  assertExists(wrapper["_wm"]);
  assertExists(wrapper["_wb"]);
});

Deno.test("Worker Wrapper manager should be defined when started", () => {
  const inst = new TestExample();
  const wrapper = new InstanceWrapper<TestExample>(inst, {});
  wrapper.start();
  inst.terminateWorker();
  assertEquals(wrapper["_wm"]["_workers"].length, 1);
});
