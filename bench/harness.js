/**
 * Benchmark harness. Grows one plant generation by generation and, for each
 * generation, measures:
 *
 *   generateMs  computing the generation (benchAdapter.generate)
 *   frameMs     one animation frame halfway through the growth
 *   hitchMs     the extra time of the frame that completes the generation,
 *               compared with an ordinary frame just before it
 *
 * It reaches the sketch only through benchAdapter and p5's redraw(), then
 * posts the numbers to the runner (bench/run.js).
 */
(function() {
  var SEED = 12345;
  var FRAME_SAMPLES = 5;
  var HITCH_SAMPLES = 3;

  // Same limits as bench/run.js, which rejects anything outside them.
  var params = new URLSearchParams(location.search);
  var maxSteps = intParam("steps", 12, 1, 20);
  var budgetMs = intParam("budget", 1000, 10, 60000);

  function intParam(name, fallback, min, max) {
    var value = parseInt(params.get(name), 10);
    if (isNaN(value)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, value));
  }

  // Small seeded generator (mulberry32) in place of Math.random, so every run
  // grows the same plant and the counts can be compared between runs.
  function seededRandom(seed) {
    var state = seed >>> 0;
    return function() {
      state = (state + 0x6D2B79F5) >>> 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function median(values) {
    var sorted = values.slice().sort(function(a, b) { return a - b; });
    return sorted[Math.floor(sorted.length / 2)];
  }

  // Draws one frame and waits for it to be really finished.
  //
  // Canvas calls are only queued by the browser; reading a pixel back makes it
  // do the drawing now. Reading the page height makes it do any pending layout
  // now. Without both, the cost would land outside the timed region.
  function timeFrame() {
    var start = performance.now();
    redraw();
    drawingContext.getImageData(0, 0, 1, 1);
    void document.body.offsetHeight;
    return performance.now() - start;
  }

  // Times the same frame several times and returns the median. If undoFrame is
  // given, it is called between samples to undo what the previous one did, so
  // every sample starts from the same page and only the last one's effects stay.
  function timeFrames(progress, samples, undoFrame) {
    var times = [];
    for (var i = 0; i < samples; i++) {
      if (i > 0 && undoFrame) {
        undoFrame();
        void document.body.offsetHeight; // lay out the undo outside the timed region
      }
      benchAdapter.setProgress(progress);
      var elapsed = timeFrame();
      times.push(elapsed);
      if (elapsed > budgetMs) {
        break; // far too slow already; one sample is enough
      }
    }
    return median(times);
  }

  function round(value) {
    return Math.round(value * 100) / 100;
  }

  function run() {
    noLoop(); // the harness decides when a frame is drawn
    // The first frame the harness draws costs far more than any after it (the
    // first pixel read-back and layout). Draw it untimed, before seeding, so it
    // neither lands in step 1, where a small --budget would end the run on it,
    // nor uses up any of the seeded random numbers.
    timeFrame();
    Math.random = seededRandom(SEED);
    benchAdapter.reset();

    var chrome = /Chrome\/(\d+)/.exec(navigator.userAgent);
    var result = {
      browser: chrome ? "Chromium " + chrome[1] : "unknown browser",
      canvas: { width: width, height: height, density: pixelDensity() },
      seed: SEED,
      rows: []
    };

    for (var step = 1; step <= maxSteps; step++) {
      var start = performance.now();
      benchAdapter.generate();
      var generateMs = performance.now() - start;

      var frameMs = timeFrames(0.5, FRAME_SAMPLES);
      var lateFrameMs = timeFrames(0.99, HITCH_SAMPLES);
      // The completing frame also adds to the page, which one real
      // completion does once per generation, not once per sample.
      var completingFrameMs = timeFrames(1, HITCH_SAMPLES, benchAdapter.undoCompletion);

      var stats = benchAdapter.stats();
      result.rows.push({
        step: step,
        chars: stats.chars,
        segments: stats.segments,
        tips: stats.tips,
        generateMs: round(generateMs),
        frameMs: round(frameMs),
        hitchMs: round(Math.max(0, completingFrameMs - lateFrameMs))
      });

      if (frameMs > budgetMs) {
        break;
      }
    }
    return result;
  }

  function report(payload) {
    fetch("/result", { method: "POST", body: JSON.stringify(payload) });
  }

  window.addEventListener("error", function(event) {
    report({ error: String(event.message) });
  });

  // Wait until p5 has run setup() and drawn its first frame.
  function whenSketchIsRunning(callback) {
    if (typeof frameCount === "number" && frameCount > 0) {
      callback();
    } else {
      requestAnimationFrame(function() { whenSketchIsRunning(callback); });
    }
  }

  whenSketchIsRunning(function() {
    report(run());
  });
})();
