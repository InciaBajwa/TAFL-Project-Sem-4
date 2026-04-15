let states = [];
let transitions = {};
let startState = null;
let finalStates = [];
let loopCountMap = {};

function drawState(state) {
    let graph = document.getElementById("graph");

    let div = document.createElement("div");
    div.classList.add("state");
    div.innerText = state;

    let index = states.length - 1;
    let x = (index % 5) * 100 + 50;
    let y = Math.floor(index / 5) * 100 + 50;

    div.style.left = x + "px";
    div.style.top = y + "px";

    div.id = "state-" + state;

    graph.appendChild(div);
}

function drawTransition(from, to, symbol) {
    let svg = document.getElementById("edges");

    svg.innerHTML = "";

    // ✅ create arrowhead once
    if (!document.getElementById("arrowhead")) {
        let defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

        let marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute("id", "arrowhead");
        marker.setAttribute("markerWidth", "8");
        marker.setAttribute("markerHeight", "6");
        marker.setAttribute("refX", "10");
        marker.setAttribute("refY", "3");
        marker.setAttribute("orient", "auto");
        marker.setAttribute("markerUnits", "strokeWidth");

        let polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", "0 0, 8 3, 0 6");
        polygon.setAttribute("fill", "#0c8ecb");

        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
    }

    let fromEl = document.getElementById("state-" + from);
    let toEl = document.getElementById("state-" + to);
    if (!fromEl || !toEl) return;

    let graph = document.getElementById("graph");
    let graphRect = graph.getBoundingClientRect();

    let fromRect = fromEl.getBoundingClientRect();
    let toRect = toEl.getBoundingClientRect();

    let x1 = fromRect.left - graphRect.left + fromRect.width / 2;
    let y1 = fromRect.top - graphRect.top + fromRect.height / 2;
    let x2 = toRect.left - graphRect.left + toRect.width / 2;
    let y2 = toRect.top - graphRect.top + toRect.height / 2;

    // ✅ direction + edge adjustment
    let dx = x2 - x1;
    let dy = y2 - y1;
    let distance = Math.sqrt(dx * dx + dy * dy) || 1;

    let r = 30;

    let newX1 = x1 + (dx / distance) * r;
    let newY1 = y1 + (dy / distance) * r;
    let newX2 = x2 - (dx / distance) * r;
    let newY2 = y2 - (dy / distance) * r;

    // =========================
    // 🔁 SELF LOOP (NO OVERLAP)
    // =========================
    if (from === to) {

        let key = from;
    
        // initialize counter
        if (!loopCountMap[key]) {
            loopCountMap[key] = 0;
        }
    
        let index = loopCountMap[key];
        loopCountMap[key]++;   // increment for next loop
    
        // 🎯 spread left-right
        let direction = index % 2 === 0 ? 1 : -1;
        let spread = Math.ceil(index / 2);
    
        let offsetX = direction * spread * 35;
        let offsetY = spread * 25;
    
        let x = x1;
        let y = y1;
    
        let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    
        let d = `
            M ${x + offsetX} ${y - 30 - offsetY}
            C ${x + 60 + offsetX} ${y - 100 - offsetY},
              ${x - 60 + offsetX} ${y - 100 - offsetY},
              ${x + offsetX} ${y - 30 - offsetY}
        `;
    
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("class", "edge");
        path.setAttribute("marker-end", "url(#arrowhead)");
        path.setAttribute("id", `edge-${from}-${symbol}-${to}-${index}`);
    
        svg.appendChild(path);
    
        let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    
        text.setAttribute("x", x + offsetX);
        text.setAttribute("y", y - 85 - offsetY);
        text.setAttribute("class", "label");
        text.textContent = symbol;
    
        svg.appendChild(text);
    
        return;
    }

    // =========================
    // 🔄 REVERSE EDGE (CURVE)
    // =========================
    let isReverse = false;

    if (transitions[to]) {
        for (let sym in transitions[to]) {
            if (transitions[to][sym].includes(from)) {
                isReverse = true;
            }
        }
    }

    if (isReverse) {

        let curveOffset = 40;

        let cx = (x1 + x2) / 2 - dy / distance * curveOffset;
        let cy = (y1 + y2) / 2 + dx / distance * curveOffset;

        let path = document.createElementNS("http://www.w3.org/2000/svg", "path");

        let d = `M ${newX1} ${newY1} Q ${cx} ${cy} ${newX2} ${newY2}`;

        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("class", "edge");
        path.setAttribute("marker-end", "url(#arrowhead)");
        path.setAttribute("id", `edge-${from}-${symbol}-${to}`);

        svg.appendChild(path);

        let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", cx);
        text.setAttribute("y", cy - 5);
        text.setAttribute("class", "label");
        text.textContent = symbol;

        svg.appendChild(text);
        return;
    }

    // =========================
    // ➡️ NORMAL EDGE
    // =========================
    let line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    line.setAttribute("x1", newX1);
    line.setAttribute("y1", newY1);
    line.setAttribute("x2", newX2);
    line.setAttribute("y2", newY2);
    line.setAttribute("class", "edge");
    line.setAttribute("marker-end", "url(#arrowhead)");
    line.setAttribute("id", `edge-${from}-${symbol}-${to}`);

    svg.appendChild(line);

    let text = document.createElementNS("http://www.w3.org/2000/svg", "text");

    text.setAttribute("x", (newX1 + newX2) / 2);
    text.setAttribute("y", (newY1 + newY2) / 2 - 5);
    text.setAttribute("class", "label");
    text.textContent = symbol;

    svg.appendChild(text);
}

// Add State
function addState() {
    let state = document.getElementById("stateName").value;
    if (states.includes(state)) {
        alert("State already exists!");
        return;
    }
    states.push(state);
    updateStates();

    drawState(state);

    document.getElementById("stateName").value = "";
}

// Add Transition
function addTransition() {
    let from = document.getElementById("fromState").value;
    let to = document.getElementById("toState").value;
    let symbol = document.getElementById("symbol").value.toLowerCase();


    if (!states.includes(from) || !states.includes(to)) {
        alert("State does not exist!");
        return;
    }

    if (!transitions[from]) {
        transitions[from] = {};
    }

    if (!transitions[from][symbol]) {
        transitions[from][symbol] = [];
    }

    if (transitions[from][symbol].includes(to)) {
        alert("Transition already exists!");
        return;
    }

    transitions[from][symbol].push(to);

    updateTransitions();

    drawTransition(from, to, symbol);

    document.getElementById("fromState").value = "";
    document.getElementById("toState").value = "";
    document.getElementById("symbol").value = "";
}

// Set Start State
function setStart() {
    startState = document.getElementById("startState").value;

    let el = document.getElementById("state-" + startState);
    if (el) el.style.border = "3px solid yellow";

}

// Add Final State
function setFinal() {
    let state = document.getElementById("finalState").value;
    finalStates.push(state);

    let el = document.getElementById("state-" + state);
    if (el) el.classList.add("final");
}

// Update UI
function updateStates() {
    let list = document.getElementById("statesList");
    list.innerHTML = "";
    states.forEach(s => {
        let li = document.createElement("li");
        li.innerText = s;
        list.appendChild(li);
    });
}

function updateTransitions() {
    let list = document.getElementById("transitionsList");
    list.innerHTML = "";

    for (let from in transitions) {
        for (let symbol in transitions[from]) {
            let li = document.createElement("li");
            li.innerText = `${from} --${symbol}--> ${transitions[from][symbol]}`;
            list.appendChild(li);
        }
    }
}

function highlightStates(statesArray) {
    // remove all highlights
    document.querySelectorAll(".state").forEach(s => {
        s.classList.remove("active");
    });

    // highlight current states
    statesArray.forEach(state => {
        let el = document.getElementById("state-" + state);
        if (el) el.classList.add("active");
    });
}

function highlightEdges(edgesArray) {
    // remove previous highlights
    document.querySelectorAll(".edge").forEach(e => {
        e.classList.remove("active");
    });

    // highlight all given edges
    edgesArray.forEach(({ from, to, symbol }) => {
        let edge = document.getElementById(`edge-${from}-${symbol}-${to}`);
        if (edge) edge.classList.add("active");
    });
}

// Simulation
async function simulate() {
    let input = document.getElementById("inputString").value.toLowerCase();
    let mode = document.getElementById("mode").value;

    if (!startState) {
        alert("Please set start state!");
        return;
    }

    // DFA Mode
    if (mode === "dfa") {

        let current = startState;

        for (let char of input) {

            highlightStates([current]);

            document.getElementById("result").innerText =
                `Reading: ${char}, Current State: ${current}`;

            await new Promise(r => setTimeout(r, 300));

            if (!transitions[current] || !transitions[current][char]) {
                document.getElementById("result").innerText = "Rejected ❌";
                return;
            }

            let next = transitions[current][char][0];

            highlightEdges([
                { from: current, to: next, symbol: char }
            ]);

            current = next;
        }

        if (finalStates.includes(current)) {
            document.getElementById("result").innerText = "Accepted ✅";
        } else {
            document.getElementById("result").innerText = "Rejected ❌";
        }

    }

    // NFA Mode
    else {

        let currentStates = [startState];

        for (let char of input) {

            highlightStates(currentStates);

            document.getElementById("result").innerText =
                `Reading: ${char}, Current States: ${currentStates.join(", ")}`;

            await new Promise(r => setTimeout(r, 300));

            let nextStates = [];
            let edgesToHighlight = [];

            currentStates.forEach(state => {
                if (transitions[state] && transitions[state][char]) {

                    transitions[state][char].forEach(next => {
                        nextStates.push(next);

                        edgesToHighlight.push({
                            from: state,
                            to: next,
                            symbol: char
                        });
                    });
                }
            });

            // remove duplicates
            currentStates = [...new Set(nextStates)];

            // highlight ALL edges at once
            highlightEdges(edgesToHighlight);
        }

        let accepted = currentStates.some(state =>
            finalStates.includes(state)
        );

        if (accepted) {
            document.getElementById("result").innerText = "Accepted ✅";
        } else {
            document.getElementById("result").innerText = "Rejected ❌";
        }
    }
}