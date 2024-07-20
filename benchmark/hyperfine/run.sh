#!/bin/sh

# Small script for using hyper as a bechmarking tool for measuring operations which do heavy I/O with sys apis
NUM_OPS=5
WORKER_COUNT=5
BUFFER_TOLERANCE=1 # only let a single worker buffer this many tasks

echo "Generating ${WORKER_COUNT} workers for ${NUM_OPS} ops"
hyperfine 'export SPAN_HYPER_TEST=sync && deno run  --no-check --allow-all parallel_perf_bench.ts' 'export SPAN_HYPER_TEST=parallel && deno run --no-check --allow-all parallel_perf_bench.ts' --runs 10 --warmup 3 --show-output