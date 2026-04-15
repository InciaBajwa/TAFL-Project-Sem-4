let states = [];
let transitions = {};
let startState = null;
let finalStates = [];
let cy = null;

// Add State
function addState() {
    let state = document.getElementById("stateName").value;
    if (states.includes(state)) {
        alert("State already exists!");
        return;
    }
    states.push(state);
    updateStates();

    drawGraph();

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

    drawGraph();

    document.getElementById("fromState").value = "";
    document.getElementById("toState").value = "";
    document.getElementById("symbol").value = "";
}

// Set Start State
function setStart() {
    startState = document.getElementById("startState").value;

    let el = document.getElementById("state-" + startState);
    if (el) el.style.border = "3px solid yellow";

    drawGraph();

}

// Add Final State
function setFinal() {
    let state = document.getElementById("finalState").value;
    finalStates.push(state);

    let el = document.getElementById("state-" + state);
    if (el) el.classList.add("final");

    drawGraph();
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

            document.getElementById("result").innerText =
                `Reading: ${char}, Current State: ${current}`;

            await new Promise(r => setTimeout(r, 300));

            if (!transitions[current] || !transitions[current][char]) {
                document.getElementById("result").innerText = "Rejected ❌";
                return;
            }

            let next = transitions[current][char][0];

            let edge = cy.edges().filter(e =>
                e.data('source') === current &&
                e.data('target') === next &&
                e.data('label') === char
            );

            edge.addClass('highlighted');

            await new Promise(r => setTimeout(r, 300));

            edge.removeClass('highlighted');

            current = next;
        }

        if (finalStates.includes(current)) {
            document.getElementById("result").innerText = "Accepted ✅";
        } else {
            document.getElementById("result").innerText = "Rejected ❌";
        }

    }

    // NFA Mode
    // NFA Mode
    else {

        let currentStates = [startState];

        for (let char of input) {

            document.getElementById("result").innerText =
                `Reading: ${char}\nCurrent States: ${currentStates.join(", ")}`;

            await new Promise(r => setTimeout(r, 500));

            let nextStates = [];

            for (let state of currentStates) {

                if (transitions[state] && transitions[state][char]) {

                    for (let next of transitions[state][char]) {

                        // 🔥 Highlight edge
                        let edge = cy.edges().filter(e =>
                            e.data('source') === state &&
                            e.data('target') === next &&
                            e.data('label') === char
                        );

                        edge.addClass('highlighted');

                        // slight delay so user can SEE it
                        await new Promise(r => setTimeout(r, 250));

                        edge.removeClass('highlighted');

                        nextStates.push(next);
                    }
                }
            }

            // remove duplicates
            currentStates = [...new Set(nextStates)];

            // ❌ dead state case
            if (currentStates.length === 0) {
                document.getElementById("result").innerText = "Rejected ❌";
                return;
            }
        }

        // ✅ acceptance check
        let accepted = currentStates.some(state =>
            finalStates.includes(state)
        );

        document.getElementById("result").innerText =
            accepted ? "Accepted ✅" : "Rejected ❌";
    }
}

function drawGraph() {

    if (cy) {
        cy.destroy();
    }

    let elements = [];

    // Add nodes
    states.forEach((state, index) => {
        elements.push({
            data: { id: state, label: state }
        });
    });

    // Add edges
    let edgeCount = {};

    for (let from in transitions) {
        for (let symbol in transitions[from]) {
            transitions[from][symbol].forEach((to, i) => {

                let key = from + "-" + to;

                if (!edgeCount[key]) {
                    edgeCount[key] = 0;
                }

                edgeCount[key]++;

                if (from === to) {
                    elements.push({
                        data: {
                            id: `${from}-${to}-${symbol}-${i}`,
                            source: from,
                            target: to,
                            label: symbol
                        },
                        classes: 'loop'
                    });
                    return;
                }

                let curve = edgeCount[key] % 2 === 0 ? 60 : -60;

                elements.push({
                    data: {
                        id: `${from}-${to}-${symbol}-${i}`,
                        source: from,
                        target: to,
                        label: symbol,
                        curve: curve
                    }
                });

            });
        }
    }

    cy = cytoscape({
        container: document.getElementById('cy'),

        elements: elements,

        style: [
            {
                selector: 'node',
                style: {
                    'background-color': '#38bdf8',
                    'label': 'data(label)',
                    'color': '#fff',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'border-width': 2,
                    'border-color': '#fff'
                }
            },

            {
                selector: 'node.final',
                style: {
                    'border-width': 6,
                    'border-color': 'gold'
                }
            },

            {
                selector: 'node.start',
                style: {
                    'border-color': 'yellow',
                    'border-width': 4
                }
            },

            {
                selector: 'edge',
                style: {
                    'curve-style': 'bezier',
                    'control-point-distance': 'data(curve)',

                    'target-arrow-shape': 'triangle',
                    'target-arrow-color': '#fff',
                    'target-arrow-scale': 0.8,
                    'line-color': '#aaa',

                    'width': 2,

                    'label': 'data(label)',
                    'font-size': 12,
                    'color': '#fff',

                    'text-background-color': '#0f172a',
                    'text-background-opacity': 1,
                    'text-background-padding': 3,

                    'text-margin-y': -10
                }
            },

            {
                selector: 'edge.highlighted',
                style: {
                    'line-color': 'yellow',
                    'target-arrow-color': 'yellow',
                    'width': 4,
                    'transition-property': 'line-color, target-arrow-color, width',
                    'transition-duration': '0.2s'
                }
            },

            {
                selector: 'edge.loop',
                style: {
                    'curve-style': 'bezier',
                    'loop-direction': '-45deg',
                    'loop-sweep': '90deg',

                    'target-arrow-shape': 'triangle',
                    'target-arrow-color': '#fff',
                    'line-color': '#aaa',

                    'label': 'data(label)',
                    'text-margin-y': -15
                }
            }
        ],

        layout: {
            name: 'circle',   // 👈 BEST for your case
            padding: 30,
            avoidOverlap: true
        }
    });

    // Apply start + final classes
    if (startState) {
        cy.getElementById(startState).addClass('start');
    }

    finalStates.forEach(s => {
        cy.getElementById(s).addClass('final');
    });

    cy.nodes().grabify();
    cy.center();
    cy.fit();
}
