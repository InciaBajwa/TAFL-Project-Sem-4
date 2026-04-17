let states = [];
let transitions = {};
let startState = null;
let finalStates = [];
let cy = null;
const THEME_KEY = "fa-sim-theme";
const definitions = {
    dfa: {
        title: "DFA Definition",
        body: "A Deterministic Finite Automaton (DFA) is a finite-state machine where, for every state and input symbol, exactly one transition is defined. The machine follows a single computation path for any input string and accepts if that path ends in a final state."
    },
    nfa: {
        title: "NFA Definition",
        body: "A Nondeterministic Finite Automaton (NFA) is a finite-state machine where a state can have zero, one, or many transitions on the same input symbol. The machine conceptually explores multiple paths, and it accepts if at least one path ends in a final state."
    }
};

function buildCyStyle(theme = "light") {
    const dark = theme === "dark";
    const nodeColor = dark ? "#ff7bd5" : "#ff5c8a";
    const nodeBorder = dark ? "#ffd5f4" : "#ffe4f0";
    const edgeColor = dark ? "#8fe9ff" : "#3bc9db";
    const textColor = dark ? "#ece9ff" : "#5a2e5f";
    const textBg = dark ? "#1b1b43" : "#fff8ea";

    return [
        {
            selector: "node",
            style: {
                "width": 68,
                "height": 68,
                "font-size": 18,
                "text-wrap": "wrap",
                "text-max-width": 54,
                "background-color": nodeColor,
                "label": "data(label)",
                "color": "#fff",
                "text-valign": "center",
                "text-halign": "center",
                "border-width": 2,
                "border-color": nodeBorder
            }
        },
        {
            selector: "node.final",
            style: {
                "border-width": 8,
                "border-color": "#f59e0b"
            }
        },
        {
            selector: "node.start",
            style: {
                "border-color": "#facc15",
                "border-width": 6
            }
        },
        {
            selector: "edge",
            style: {
                "curve-style": "bezier",
                "control-point-distance": "data(curve)",
                "target-arrow-shape": "triangle",
                "target-arrow-color": edgeColor,
                "target-arrow-scale": 1,
                "line-color": edgeColor,
                "width": 3,
                "label": "data(label)",
                "font-size": 14,
                "color": textColor,
                "text-background-color": textBg,
                "text-background-opacity": 0.9,
                "text-background-padding": 3,
                "text-margin-y": -10
            }
        },
        {
            selector: "edge.highlighted",
            style: {
                "line-color": "#f59e0b",
                "target-arrow-color": "#f59e0b",
                "width": 4,
                "transition-property": "line-color, target-arrow-color, width",
                "transition-duration": "0.2s"
            }
        },
        {
            selector: "edge.loop",
            style: {
                "curve-style": "bezier",
                "loop-direction": "-45deg",
                "loop-sweep": "90deg",
                "target-arrow-shape": "triangle",
                "target-arrow-color": edgeColor,
                "line-color": edgeColor,
                "label": "data(label)",
                "text-margin-y": -15
            }
        }
    ];
}

function getCurrentTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
}

function applyCyTheme(theme) {
    if (!cy) return;
    cy.style(buildCyStyle(theme));
}

function applyTheme(theme, shouldPersist = true) {
    document.documentElement.setAttribute("data-theme", theme);
    const toggleBtn = document.getElementById("themeToggle");
    if (toggleBtn) {
        toggleBtn.innerText = theme === "dark" ? "Light Mode" : "Dark Mode";
    }
    if (shouldPersist) {
        localStorage.setItem(THEME_KEY, theme);
    }
    applyCyTheme(theme);
}

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const preferredDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = savedTheme || (preferredDark ? "dark" : "light");
    applyTheme(theme, false);
}

function toggleTheme() {
    const nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
    applyTheme(nextTheme, true);
}

function setResultMessage(message, stateClass = "state-info") {
    const resultEl = document.getElementById("result");
    resultEl.innerText = message;
    resultEl.classList.remove("state-info", "state-accepted", "state-rejected");
    resultEl.classList.add(stateClass);
}

function cleanInput(id) {
    return document.getElementById(id).value.trim();
}

function getTransitionCount() {
    let total = 0;
    for (const from in transitions) {
        for (const symbol in transitions[from]) {
            total += transitions[from][symbol].length;
        }
    }
    return total;
}

function updateStats() {
    const uniqueFinals = [...new Set(finalStates)];
    const modeValue = document.getElementById("mode").value.toUpperCase();

    document.getElementById("modeBadge").innerText = modeValue;
    document.getElementById("stateCount").innerText = String(states.length);
    document.getElementById("transitionCount").innerText = String(getTransitionCount());
    document.getElementById("finalCount").innerText = String(uniqueFinals.length);
    document.getElementById("statesMiniCount").innerText = String(states.length);
    document.getElementById("transitionsMiniCount").innerText = String(getTransitionCount());
    updateTransitionTable();
}

function getAlphabet() {
    const symbols = new Set();
    for (const from in transitions) {
        for (const symbol in transitions[from]) {
            symbols.add(symbol);
        }
    }
    return [...symbols].sort();
}

function getStateLabel(state) {
    const labels = [];
    if (state === startState) labels.push("S");
    if (finalStates.includes(state)) labels.push("F");
    return labels.length ? `[${labels.join(",")}] ${state}` : state;
}

function formatTransitionCell(mode, targets) {
    if (!targets || targets.length === 0) {
        return { text: mode === "dfa" ? "-" : "{}", className: "missing" };
    }

    if (mode === "dfa") {
        if (targets.length === 1) {
            return { text: targets[0], className: "" };
        }
        return { text: `${targets.join(", ")} (!)`, className: "nondet" };
    }

    return { text: `{${targets.join(", ")}}`, className: "" };
}

function updateTransitionTable() {
    const titleEl = document.getElementById("transitionTableTitle");
    const hintEl = document.getElementById("transitionTableHint");
    const wrapEl = document.getElementById("transitionTableWrap");
    if (!titleEl || !hintEl || !wrapEl) return;

    const mode = document.getElementById("mode").value;
    const alphabet = getAlphabet();
    titleEl.innerText = `Transition Table (${mode.toUpperCase()})`;

    if (states.length === 0) {
        hintEl.innerText = "Add at least one state to generate the table.";
        wrapEl.innerHTML = "";
        return;
    }

    if (alphabet.length === 0) {
        hintEl.innerText = "Add transitions to populate table columns.";
        wrapEl.innerHTML = "";
        return;
    }

    hintEl.innerText = mode === "dfa"
        ? "Rows = states, columns = symbols. [S]=Start, [F]=Final. '(!)' indicates non-deterministic entries."
        : "Rows = states, columns = symbols. [S]=Start, [F]=Final. Cells show reachable state sets.";

    const table = document.createElement("table");
    table.className = "transition-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");

    const stateHead = document.createElement("th");
    stateHead.className = "state-col";
    stateHead.innerText = "State";
    headRow.appendChild(stateHead);

    alphabet.forEach(symbol => {
        const th = document.createElement("th");
        th.innerText = symbol;
        headRow.appendChild(th);
    });

    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    states.forEach(state => {
        const row = document.createElement("tr");
        if (state === startState) row.classList.add("row-start");
        if (finalStates.includes(state)) row.classList.add("row-final");

        const stateCell = document.createElement("td");
        stateCell.className = "state-col";
        stateCell.innerText = getStateLabel(state);
        row.appendChild(stateCell);

        alphabet.forEach(symbol => {
            const cell = document.createElement("td");
            const targets = transitions[state] && transitions[state][symbol]
                ? transitions[state][symbol]
                : [];
            const { text, className } = formatTransitionCell(mode, targets);
            cell.innerText = text;
            if (className) {
                cell.classList.add(className);
            }
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    wrapEl.innerHTML = "";
    wrapEl.appendChild(table);
}

function updateDefinitionHighlight() {
    const mode = document.getElementById("mode").value;
    document.getElementById("dfaCard").classList.toggle("active", mode === "dfa");
    document.getElementById("nfaCard").classList.toggle("active", mode === "nfa");
}

function viewDefinition() {
    const mode = document.getElementById("mode").value;
    const info = definitions[mode];
    const modal = document.getElementById("definitionModal");

    document.getElementById("definitionTitle").innerText = info.title;
    document.getElementById("definitionBody").innerText = info.body;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
}

function hideDefinition() {
    const modal = document.getElementById("definitionModal");
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
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
    let state = cleanInput("stateName");
    if (!state) {
        alert("Please enter a state name.");
        return;
    }
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
    let from = cleanInput("fromState");
    let to = cleanInput("toState");
    let symbol = cleanInput("symbol").toLowerCase();

    if (!from || !to || !symbol) {
        alert("Please fill all transition fields.");
        return;
    }

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
    const state = cleanInput("startState");
    if (!state) {
        alert("Please enter a start state.");
        return;
    }
    if (!states.includes(state)) {
        alert("Start state must be an existing state.");
        return;
    }
    startState = state;

    drawGraph();
    setResultMessage(`Start state set to ${state}.`, "state-info");
    updateStats();

}

// Add Final State
function setFinal() {
    let state = cleanInput("finalState");
    if (!state) {
        alert("Please enter a final state.");
        return;
    }
    if (!states.includes(state)) {
        alert("Final state must be an existing state.");
        return;
    }
    if (finalStates.includes(state)) {
        alert("Final state already added.");
        return;
    }
    finalStates.push(state);
    document.getElementById("finalState").value = "";

    drawGraph();
    setResultMessage(`Final state ${state} added.`, "state-info");
    updateStats();
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
    updateStats();
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
    updateStats();
}

function resetMachine() {
    states = [];
    transitions = {};
    startState = null;
    finalStates = [];

    updateStates();
    updateTransitions();
    drawGraph();

    document.getElementById("stateName").value = "";
    document.getElementById("fromState").value = "";
    document.getElementById("toState").value = "";
    document.getElementById("symbol").value = "";
    document.getElementById("startState").value = "";
    document.getElementById("finalState").value = "";
    document.getElementById("inputString").value = "";

    setResultMessage("Machine reset. Add states and transitions to begin.", "state-info");
    updateStats();
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
    initTheme();

    cy = cytoscape({
        container: document.getElementById('cy'),

        elements: [],

        style: buildCyStyle(getCurrentTheme()),

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

    document.getElementById("mode").addEventListener("change", () => {
        updateStats();
        updateDefinitionHighlight();
        setResultMessage("Mode changed. Run simulation again with current machine.", "state-info");
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            hideDefinition();
        }
        if (event.key.toLowerCase() === "t" && !["input", "textarea", "select"].includes(document.activeElement.tagName.toLowerCase())) {
            toggleTheme();
        }
    });

    document.getElementById("definitionModal").addEventListener("click", event => {
        if (event.target.id === "definitionModal") {
            hideDefinition();
        }
    });

    updateStats();
    updateDefinitionHighlight();
}
