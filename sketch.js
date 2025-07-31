/**
 * Class representing hyphae sentences.
 *
 * This class encapsulates a sentence generation process based on an initial axiom,
 * including calculation of its maximum depth (using a helper like findMaxDepth) and state management 
 * to facilitate animations of sentence transitions. It also stores coordinate information for drawing purposes.
 */
 
/**
 * Creates an instance of HyphaeSentences.
 *
 * @constructor
 * @param {string} axiom - The initial axiom for generating the sentence.
 * @param {number} x - The x-coordinate for the starting point of drawing.
 * @param {number} y - The y-coordinate for the starting point of drawing.
 */
class HyphaeSentence {


  constructor(axiom, x, y, rules) {
    this.sentence = axiom; // The initial axiom
    this.depth = findMaxDepth(axiom); // Calculate the maximum depth of M's in the axiom
    this.previousSentence = ""; // To store the previous state of the sentence for animation
    this.previousDepth = findMaxDepth(axiom);
    this.x = x; // X coordinate for start of drawing
    this.y = y; // Y coordinate for start of drawing
    this.rules = rules; // Rules for generating the next sentence
    this.animating = false; // Flag to indicate if the sentence is currently being animated
    this.animationProgress = 0; // Progress of the animation
    this.animationSpeed = 0.002; // Speed of the animation
  }

  static genAngles() {
    var result = [];
    for (var i = 0; i < 8; i++) {
      // Generate random angles between -40 and 40
      result.push(Math.floor(Math.random() * 81) - 40);
    }
    return result;
  }

  step() {
    // console.log("stepping..." + this.sentence);
    if (this.animating) {
      // console.log("Already animating... failed to step: " + this.sentence);
      return; // Prevent triggering new step during animation
    }

    // TODO: make each HyphaeSentence instance animate independently
    this.animating = true; // Set the animating flag to true
    this.animationProgress = 0; // Reset animation progress for the new step

    var angles = HyphaeSentence.genAngles(); // Generate random angles for the replacements
    var nextSentence = ""; // Initialize the next sentence
    for (var i = 0; i < this.sentence.length;) {
      var checkRulesResult = checkRules(this.sentence, i, this.rules); // Check if any rule matches at the current index
      if (checkRulesResult !== null) {
        // Implemented replacement: build the replacement string from rule "b" and insert angles dynamically.
        var replacementTemplate = checkRulesResult.b;
        var letterMap = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6 };
        var replacement = replacementTemplate.replace(/[a-g]/g, function(match) {
          return turnString(angles[letterMap[match]]);
        });
        nextSentence += replacement; // Append the dynamic replacement string

        angles = HyphaeSentence.genAngles(); // Generate new angles for each replacement
        i += checkRulesResult.a.length; // Move the index forward by the matched rule length
      } else {
        nextSentence += this.sentence.charAt(i); // If no rule matches, keep the current character
        i++;
      }
    }
    this.previousSentence = this.sentence; // Store the previous sentence for animation
    this.previousDepth = this.depth; // Store the previous depth for animation
    this.sentence = nextSentence; // Update the sentence to the next one
    this.depth = findMaxDepth(nextSentence); // Calculate the new maximum depth of the sentence
  }

}

var rules1 = [];
rules1[0] = {
  a: "M]",
  b: "M[aMbMcM][eMfMgM]]"
}
// var replacement = "M" + "[" + turnString(angles[1]) + "M" + turnString(angles[2]) + "M" + turnString(angles[3]) + "M]" + "[" + turnString(angles[5]) + "M" + turnString(angles[6]) + "M" + turnString(angles[7]) + "M]]";
var axiom1 = "[M]"; // Initial axiom for the first hyphae sentence
var hyphaeSentences = [new HyphaeSentence(axiom1, 400, 400, rules1), new HyphaeSentence(axiom1, 55, 600, rules1)]; // Create an array of hyphae sentences

var len = 10;
var degrees = 1;
var angle = degrees * (Math.PI / 180);

function turnString(deg) {
  var result = "";
  var absDeg = Math.abs(deg);
  for (var i = 0; i < absDeg; i++) {
    result += (deg >= 0 ? "+" : "-");
  }
  return result;
}

/**
 * Checks if any rule defined in the global "rules" array matches the substring
 * of "sentence" starting at the given "index". For each rule, the function compares
 * the sequence of characters in the sentence with the rule's "a" property.
 *
 * If a full match is found for a rule, the function returns the number of characters
 * matched (i.e. the length of the rule's "a" string), which indicates how many characters
 * the matching algorithm should move forward. If no rule matches, the function returns 0.
 *
 * @param {string} sentence - The string to be checked against the defined rules.
 * @param {number} index - The index within the sentence to start checking for a match.
 * @param {Array} rules - The array of rule objects, each containing properties "a" and "b".
 * @returns {object} - Returns the rule matched (if any).
 */
function checkRules(sentence, index, rules) {
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    var a = rule.a;
    var found = true;
    for (var j = 0; j < a.length; j++) {
      var sentenceChar = sentence.charAt(index + j);
      if (sentenceChar != a.charAt(j)) {
        found = false;
        break;
      }
    }
    if (found) {
      return rule; // Return the rule object that matched
    }
  }
  return null;
}

function step() {
  // iterate over each hyphae sentence
  for (var hIndex = 0; hIndex < hyphaeSentences.length; hIndex++) {
    var currentHyphaeSentence = hyphaeSentences[hIndex];
    currentHyphaeSentence.step(); // Call the step method to evolve the sentence
  }
}

function turtle() {
  background(51);
  resetMatrix();
  
  // Draw each sentence individually
  for(var hIndex = 0; hIndex < hyphaeSentences.length; hIndex++) {
    var progress = hyphaeSentences[hIndex].animating ? hyphaeSentences[hIndex].animationProgress : 1.0;
    drawSingleSentence(hyphaeSentences[hIndex], progress);
  }
}

function findMaxDepth(sentence) {
  var maxLength = 0;
  var currentLength = 0;
  var intStack = [0];
  var intStackIndex = 0;
  for (var i = 0; i < sentence.length; i++) {
    if (sentence.charAt(i) == "M") {
      currentLength++;
      intStack[intStackIndex]++;
      if (currentLength > maxLength) {
        maxLength = currentLength;
      }
    }
    if (sentence.charAt(i) == "[") {
      intStack.push(0);
      intStackIndex++;
    }
    if (sentence.charAt(i) == "]") {
      currentLength -= intStack[intStackIndex];
      intStack[intStackIndex] = 0;
      intStack.pop();
      intStackIndex--;
    }
  }
  return maxLength;
}

function drawSingleSentence(hyphaeSentence, progress) {
  push();
  translate(hyphaeSentence.x, hyphaeSentence.y);
  stroke(255, 255, 200, 255);
  
  // Calculate how many characters to draw based on progress
  var lastMaxDepth = hyphaeSentence.previousDepth;
  var drawDepth = lastMaxDepth + (hyphaeSentence.depth - lastMaxDepth) * progress;
  
  var currentDepth = 0;
  var intStack = [0];
  var intStackIndex = 0;
  for (var i = 0; i < hyphaeSentence.sentence.length; i++) {
    var current = hyphaeSentence.sentence.charAt(i);
    if (current == "M" && currentDepth < Math.floor(drawDepth)) {
      if (currentDepth < 1)
        stroke(255, 255, 200, 160); // more transparent for the first M
      else
        stroke(255, 255, 200, 255);
      currentDepth++;
      intStack[intStackIndex]++;

      line(0, 0, 0, -len);
      translate(0, -len);
    } else if (current == "M" && currentDepth < drawDepth) {
      currentDepth++;
      intStack[intStackIndex]++;
      var partialScalar = Math.abs((currentDepth - drawDepth) - 1);
      // Draw the tips of the hyphae that aren't fully extended yet
      var partialLength = -len * Math.abs((currentDepth - drawDepth) - 1);
      line(0, 0, 0, partialLength);
    } else if (current == "+") {
      rotate(angle);
    } else if (current == "-") {
      rotate(-angle);
    } else if (current == "[") {
      intStack.push(0);
      intStackIndex++;
      push();
    } else if (current == "]") {
      currentDepth -= intStack.pop();
      intStackIndex--;
      pop();
    }
  }
  pop();
}

function drawSentences(progress) {
  // Legacy function - kept for compatibility but no longer used
  // Draw each sentence using horizontal offsets
  for (var sIndex = 0; sIndex < hyphaeSentences.length; sIndex++) {
    drawSingleSentence(hyphaeSentences[sIndex], progress);
  }
}

function setup() {
  // Create responsive canvas that fills the window
  createCanvas(windowWidth, windowHeight);
  
  // Create button container div
  var buttonContainer = createDiv('');
  buttonContainer.class('button-container');
  
  // Create buttons and add them to the container
  var stepBtn = createButton("step");
  stepBtn.mousePressed(step);
  stepBtn.parent(buttonContainer);
  
  var run_interval = null; // Variable to hold the interval ID
  var runBtn = createButton("run");
  runBtn.mousePressed(function() {
    run_interval = setInterval(step, 50); // Start stepping every 50ms
  });
  runBtn.parent(buttonContainer);
  
  var stopBtn = createButton("stop");
  stopBtn.mousePressed(function() {
    clearInterval(run_interval); // Stop the stepping interval
  });
  stopBtn.parent(buttonContainer);
  
  // Hide the default cursor when over the canvas
  noCursor();
}

// Handle window resizing
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(51);
  turtle();
  
  // Handle animation
  for(var i = 0; i < hyphaeSentences.length; i++) {
    // Check if the sentence is animating
    if (hyphaeSentences[i].animating) {
      // console.log("Animation progress: " + hyphaeSentences[i].animationProgress);
      hyphaeSentences[i].animationProgress += hyphaeSentences[i].animationSpeed;
      // console.log("Animation progress: " + hyphaeSentences[i].animationProgress);
      if (hyphaeSentences[i].animationProgress >= 1.0) {
        hyphaeSentences[i].animationProgress = 1.0;
        hyphaeSentences[i].animating = false;
        createP(hyphaeSentences[i].sentence);
      }
    }
  }
  
  // Draw custom cursor circle when mouse is over canvas
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    push();
    stroke(255, 100, 100);
    strokeWeight(2);
    noFill();
    circle(mouseX, mouseY, 20);
    pop();
  }
}

function mousePressed() {
  // Check if the mouse click is within the canvas bounds
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    // Add a new hyphae sentence immediately at the clicked location
    var newHyphae = new HyphaeSentence(axiom1, mouseX, mouseY, rules1);
    hyphaeSentences.push(newHyphae);
  }
}
