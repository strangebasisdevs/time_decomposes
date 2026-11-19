# Benchmark

Measures how the cost of one frame grows as a plant grows, so that a change to
the sketch can be judged by numbers instead of by eye.

## Run it

You need Node.js 18 or newer and Chrome, Chromium or Edge. There is nothing to
install.

```bash
node bench/run.js
```

Options: `--steps N` (generations to grow, 1 to 20, default 12), `--budget MS`
(stop once a frame is slower than this, 10 to 60000, default 1000), `--json`
(raw numbers). If the browser is not found, set `CHROME_PATH` to it.

## What it does

`run.js` serves this repository on the loopback address, opens
`bench/bench.html` in a headless browser and prints what the page reports.
The page loads the real `sketch.js`, grows a single plant in the middle of the
canvas one generation at a time, and times three things per generation:

| Column | Meaning |
| --- | --- |
| `chars` | characters in the L-system sentence |
| `segments` | line segments in the plant |
| `tips` | growing ends |
| `generate ms` | computing the generation |
| `frame ms` | one animation frame, halfway through the growth (median of 5) |
| `hitch ms` | extra time of the frame that completes the generation, compared with an ordinary frame just before it |

The **score** is the deepest generation whose frame still fits 60 frames per
second (16.7 ms). A stall between two generations is roughly
`generate ms + hitch ms`.

Random numbers are seeded, so every run grows the same plant: `chars`,
`segments` and `tips` must not change unless the growth rules change.

## Baseline

The sketch before any optimization:

| step | chars | segments | tips | generate ms | frame ms | hitch ms |
|-----:|------:|---------:|-----:|------------:|---------:|---------:|
| 6 | 8371 | 379 | 64 | 0.22 | 1.35 | 0.42 |
| 8 | 34242 | 1531 | 256 | 0.63 | 5.27 | 0.75 |
| 10 | 134480 | 6139 | 1024 | 2.39 | 20.35 | 4.08 |
| 12 | 534811 | 24571 | 4096 | 10.45 | 78.26 | 12.60 |
| 14 | 2153634 | 98299 | 16384 | 29.34 | 321.28 | 59.75 |

Score: step 9. Every column doubles from one step to the next.

## Reading the numbers

- Times depend on the machine and on what else it is doing. Compare two runs
  made on the same machine, close together, and look at ratios rather than
  absolute values.
- A headless browser may draw with different hardware acceleration than a
  window on screen. The benchmark shows how cost scales, not the exact frame
  rate you will see.
- Each frame is forced to finish inside the timed region: the page reads one
  pixel back (canvas calls are otherwise only queued) and reads the page
  height (layout is otherwise postponed).
- It does not measure whether growth keeps the same speed when frames get
  slow, or what an idle page costs. Those need a different test.

## When the sketch changes

`adapter.js` is the only file here that knows how `sketch.js` works inside.
If a change renames or replaces what the adapter touches, update the adapter
so that its five functions keep the promises written above each of them, and
leave `harness.js` alone. The numbers before and after then mean the same
thing.

## Sharing results

The output holds counts, times and a browser version: no file paths, user or
machine names. It can be pasted into a pull request as it is.
