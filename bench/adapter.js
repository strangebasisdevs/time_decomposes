/**
 * The one place in bench/ that knows how sketch.js works inside.
 *
 * The harness only ever calls these four functions and p5's redraw(). When the
 * sketch changes shape (new data structures, a different animation clock),
 * update this file so each function still keeps its promise, and leave the
 * harness alone. That keeps "before" and "after" numbers comparable.
 */
var benchAdapter = {

  /**
   * Replace whatever the sketch starts with by one plant in the middle of the
   * canvas, at generation 0.
   */
  reset: function() {
    hyphaeSentences = [
      new HyphaeSentence("[M]", Math.round(width / 2), Math.round(height / 2), rules1)
    ];
  },

  /**
   * Compute the next generation now, whether or not the previous one has
   * finished animating. The harness times this call.
   */
  generate: function() {
    var plant = hyphaeSentences[0];
    plant.animating = false;
    plant.step();
  },

  /**
   * Put the growth animation at a fraction of the current generation, so the
   * next frame draws that moment.
   *
   * Promise: with 0.5 or 0.99 the next frame is an ordinary animation frame;
   * with 1 the next frame is the one that completes the generation, including
   * whatever the sketch does at that moment.
   */
  setProgress: function(progress) {
    var plant = hyphaeSentences[0];
    plant.animating = true;
    plant.animationProgress = progress;
  },

  /**
   * How big the current generation is.
   *   chars:    characters the sketch walks through per frame
   *   segments: line segments in the plant
   *   tips:     growing ends
   */
  stats: function() {
    var sentence = hyphaeSentences[0].sentence;
    var segments = 0;
    var tips = 0;
    for (var i = 0; i < sentence.length; i++) {
      if (sentence.charAt(i) == "M") {
        segments++;
        if (sentence.charAt(i + 1) == "]") {
          tips++;
        }
      }
    }
    return { chars: sentence.length, segments: segments, tips: tips };
  }
};
