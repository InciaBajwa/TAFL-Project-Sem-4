let states = [];
let transitions = {};
let startState = null;
let finalStates = [];
let cy = null;

function setResultMessage(message, stateClass = "state-info") {
    const resultEl = document.getElementById("result");
    resultEl.innerText = message;
    resultEl.classList.remove("state-info", "state-accepted", "state-rejected");
    resultEl.classList.add(stateClass);
}

function getNodePositions() {
    const positions = {};
    const totalStates = states.length;

    if (totalStates === 0 || !cy) {
        return positions;
    }

    const width = Math.max(cy.width(), 300);
    const height = Math.max(cy.height(), 300);
    const padding = 70;
    const usableWidth = Math.max(width - padding * 2, 140);
    const usableHeight = Math.max(height - padding * 2, 140);
    const columns = Math.max(1, Math.ceil(Math.sqrt(totalStates)));
    const rows = Math.max(1, Math.ceil(totalStates / columns));
    const cellWidth = usableWidth / columns;
    const cellHeight = usableHeight / rows;

    states.forEach((state, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);

        positions[state] = {
            x: padding + (column + 0.5) * cellWidth,
            y: padding + (row + 0.5) * cellHeight
        };
    });

    return positions;
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

            setResultMessage(`Reading: ${char}, Current State: ${current}`, "state-info");

            await new Promise(r => setTimeout(r, 300));

            if (!transitions[current] || !transitions[current][char]) {
                setResultMessage("Rejected ❌", "state-rejected");
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
            setResultMessage("Accepted ✅", "state-accepted");
        } else {
            setResultMessage("Rejected ❌", "state-rejected");
        }

    }

    // NFA Mode
    else {

        let currentStates = [startState];

        for (let char of input) {

            setResultMessage(`Reading: ${char}\nCurrent States: ${currentStates.join(", ")}`, "state-info");

            await new Promise(r => setTimeout(r, 500));

            let nextStates = [];

            for (let state of currentStates) {

                if (transitions[state] && transitions[state][char]) {

                    for (let next of transitions[state][char]) {

                        // Highlight edge
                        let edge = cy.edges().filter(e =>
                            e.data('source') === state &&
                            e.data('target') === next &&
                            e.data('label') === char
                        );

                        edge.addClass('highlighted');

                        // slight delay so user can see it
                        await new Promise(r => setTimeout(r, 250));

                        edge.removeClass('highlighted');

                        nextStates.push(next);
                    }
                }
            }

            // remove duplicates
            currentStates = [...new Set(nextStates)];

            // dead state case
            if (currentStates.length === 0) {
                setResultMessage("Rejected ❌", "state-rejected");
                return;
            }
        }

        // acceptance check
        let accepted = currentStates.some(state =>
            finalStates.includes(state)
        );

        setResultMessage(accepted ? "Accepted ✅" : "Rejected ❌", accepted ? "state-accepted" : "state-rejected");
    }
}

function drawGraph() {

    if (!cy) return;

    cy.resize();
    cy.elements().remove();

    const positions = getNodePositions();
    let elements = [];

    // Add nodes
    states.forEach((state, index) => {
        elements.push({
            data: { id: state, label: state },
            position: positions[state]
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

    cy.add(elements);

    cy.layout({
        name: 'preset',
        fit: true,
        padding: 30,
        animate: false
    }).run();

    // Apply start + final classes
    if (startState) {
        cy.getElementById(startState).addClass('start');
    }

    finalStates.forEach(s => {
        cy.getElementById(s).addClass('final');
    });

    // cy.nodes().grabify();
}

function initGraph() {
    cy = cytoscape({
        container: document.getElementById('cy'),

        elements: [],

        style: [
            {
                selector: 'node',
                style: {
                    'width': 68,
                    'height': 68,
                    'font-size': 18,
                    'text-wrap': 'wrap',
                    'text-max-width': 54,

                    'background-color': '#0f766e',
                    'label': 'data(label)',
                    'color': '#fff',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'border-width': 2,
                    'border-color': '#d1f4ef'
                }
            },

            {
                selector: 'node.final',
                style: {
                    'border-width': 8,
                    'border-color': '#f59e0b'
                }
            },

            {
                selector: 'node.start',
                style: {
                    'border-color': '#facc15',
                    'border-width': 6
                }
            },

            {
                selector: 'edge',
                style: {
                    'curve-style': 'bezier',
                    'control-point-distance': 'data(curve)',

                    'target-arrow-shape': 'triangle',
                    'target-arrow-color': '#475569',
                    'target-arrow-scale': 1,
                    'line-color': '#64748b',

                    'width': 3,

                    'label': 'data(label)',
                    'font-size': 14,
                    'color': '#1f2937',

                    'text-background-color': '#fffdf9',
                    'text-background-opacity': 0.9,
                    'text-background-padding': 3,

                    'text-margin-y': -10
                }
            },

            {
                selector: 'edge.highlighted',
                style: {
                    'line-color': '#f59e0b',
                    'target-arrow-color': '#f59e0b',
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
                    'target-arrow-color': '#475569',
                    'line-color': '#64748b',

                    'label': 'data(label)',
                    'text-margin-y': -15
                }
            }
        ],

        layout: {
            name: 'preset',
            fit: true,
            padding: 30,
            animate: false
        }
    });

    cy.minZoom(0.5);
    cy.maxZoom(1.5);

    window.addEventListener('resize', () => {
        if (!cy) return;
        drawGraph();
    });
}
