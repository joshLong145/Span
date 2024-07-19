#!/bin/sh

hyperfine 'export SPAN_HYPER_TEST=sync && deno run  --no-check --allow-all parallel_perf_bench.ts' --show-output --runs 10
hyperfine 'export SPAN_HYPER_TEST=parallel && deno run --no-check --allow-all parallel_perf_bench.ts' --show-output --runs 10