import { WorkerState } from "./types.ts";

export const STATES: Record<string, WorkerState> = {
  READY: "READY",
  IDLE: "IDLE",
  BUSY: "BUSY",
  TERM: "TERM",
  ABORT: "ABORT",
};
