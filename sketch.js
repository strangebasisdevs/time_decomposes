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

  /**
   * Generates a randomized axiom with variable number of [A] patterns and random angles
   * @param {number} minCount - Minimum number of [A] patterns (default: 1)
   * @param {number} maxCount - Maximum number of [A] patterns (default: 5)
   * @param {number} minAngle - Minimum angle value (default: -40)
   * @param {number} maxAngle - Maximum angle value (default: 40)
   * @returns {string} - A randomized axiom string
   */
  static generateRandomAxiom(minCount = 1, maxCount = 5, minAngle = -40, maxAngle = 40) {
    // Generate random count of [A] patterns
    var count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
    
    var axiom = "";
    
    for (var i = 0; i < count; i++) {
      // Generate random angle for this [A] pattern
      var randomAngle = Math.floor(Math.random() * (maxAngle - minAngle + 1)) + minAngle;
      
      // Convert angle to turn string format
      var angleString = HyphaeSentence.generateTurnString(randomAngle);
      
      // Add [A] pattern with the random angle
      axiom += "[" + angleString + "M]";
    }
    
    return axiom;
  }

  /**
   * Helper method to generate turn string from angle value
   * @param {number} deg - Angle in degrees
   * @returns {string} - Turn string with + or - characters
   */
  static generateTurnString(deg) {
    var result = "";
    var absDeg = Math.abs(deg);
    for (var i = 0; i < absDeg; i++) {
      result += (deg >= 0 ? "+" : "-");
    }
    return result;
  }

  /**
   * Creates a new HyphaeSentence instance with a randomized axiom
   * @param {number} x - X coordinate for positioning
   * @param {number} y - Y coordinate for positioning
   * @param {Array} rules - Rules array for sentence generation
   * @param {number} minCount - Minimum number of [A] patterns (default: 1)
   * @param {number} maxCount - Maximum number of [A] patterns (default: 5)
   * @param {number} minAngle - Minimum angle value (default: -40)
   * @param {number} maxAngle - Maximum angle value (default: 40)
   * @returns {HyphaeSentence} - New instance with randomized axiom
   */
  static createWithRandomAxiom(x, y, rules, minCount = 1, maxCount = 5, minAngle = -40, maxAngle = 40) {
    var randomAxiom = HyphaeSentence.generateRandomAxiom(minCount, maxCount, minAngle, maxAngle);
    return new HyphaeSentence(randomAxiom, x, y, rules);
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

// Development and performance tracking variables
var DEV_MODE = false; // Set to false for production
var fpsCounter = 0;
var frameTimeHistory = [];
var avgFPS = 0;
var fpsDisplay;
var lastPerformanceCheck = 0;

// Performance monitoring function
function logPerformance(label) {
  if (DEV_MODE && millis() - lastPerformanceCheck > 5000) { // Log every 5 seconds
    console.log(`Performance Check - ${label}:`);
    console.log(`  FPS: ${avgFPS}`);
    console.log(`  Hyphae objects: ${hyphaeSentences.length}`);
    console.log(`  Animating objects: ${hyphaeSentences.filter(h => h.animating).length}`);
    console.log(`  Average sentence length: ${Math.round(hyphaeSentences.reduce((sum, h) => sum + h.sentence.length, 0) / hyphaeSentences.length)}`);
    lastPerformanceCheck = millis();
  }
}

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
    // Only start a new interval if one isn't already running
    if (run_interval === null) {
      run_interval = setInterval(step, 50); // Start stepping every 50ms
    }
  });
  runBtn.parent(buttonContainer);
  
  var stopBtn = createButton("stop");
  stopBtn.mousePressed(function() {
    if (run_interval !== null) {
      clearInterval(run_interval); // Stop the stepping interval
      run_interval = null; // Reset the variable to allow new intervals
    }
  });
  stopBtn.parent(buttonContainer);
  
  // Create development mode toggle button
  var devBtn = createButton("dev: " + (DEV_MODE ? "ON" : "OFF"));
  devBtn.mousePressed(function() {
    DEV_MODE = !DEV_MODE;
    devBtn.html("dev: " + (DEV_MODE ? "ON" : "OFF"));
    
    if (DEV_MODE && !fpsDisplay) {
      fpsDisplay = createDiv('FPS: 0');
      fpsDisplay.class('fps-counter');
      frameTimeHistory = []; // Reset frame history
    } else if (!DEV_MODE && fpsDisplay) {
      fpsDisplay.remove();
      fpsDisplay = null;
    }
  });
  devBtn.parent(buttonContainer);
  
  // Create FPS counter display if in development mode
  if (DEV_MODE) {
    fpsDisplay = createDiv('FPS: 0');
    fpsDisplay.class('fps-counter');
  }
  
  // Hide the default cursor when over the canvas
  noCursor();
}

// Handle window resizing
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  // Performance tracking for development mode
  if (DEV_MODE) {
    var currentTime = millis();
    if (frameTimeHistory.length > 0) {
      var deltaTime = currentTime - frameTimeHistory[frameTimeHistory.length - 1];
      var currentFPS = 1000 / deltaTime;
      
      // Keep rolling average of last 60 frames
      frameTimeHistory.push(currentTime);
      if (frameTimeHistory.length > 60) {
        frameTimeHistory.shift();
      }
      
      // Calculate average FPS every 10 frames to reduce jitter
      if (frameCount % 10 === 0) {
        var totalTime = frameTimeHistory[frameTimeHistory.length - 1] - frameTimeHistory[0];
        avgFPS = Math.round((frameTimeHistory.length - 1) * 1000 / totalTime);
        var animatingCount = hyphaeSentences.filter(h => h.animating).length;
        fpsDisplay.html('FPS: ' + avgFPS + ' | Objects: ' + hyphaeSentences.length + ' | Animating: ' + animatingCount);
      }
    } else {
      frameTimeHistory.push(currentTime);
    }
    
    // Log performance metrics periodically
    logPerformance("Draw Loop");
  }
  
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
  // Check if the mouse click is within the canvas bounds and not on a UI element
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    // Check if the click is not on any button or UI element
    var clickedElement = document.elementFromPoint(mouseX, mouseY);
    
    // If the clicked element is a button or inside a button container, don't add hyphae
    if (clickedElement && (
        clickedElement.tagName === 'BUTTON' || 
        clickedElement.closest('.button-container') ||
        clickedElement.closest('.fps-counter')
    )) {
      return; // Exit early if clicking on UI elements
    }
    
    // Add a new hyphae sentence with randomized axiom at the clicked location
    // This will create 1-25 [A] patterns with angles between -180 and 180 degrees
    var newHyphae = HyphaeSentence.createWithRandomAxiom(mouseX, mouseY, rules1, 1, 25, -180, 180);
    hyphaeSentences.push(newHyphae);
  }
}
