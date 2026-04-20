let states = [];
let transitions = {};
let startState = null;
let finalStates = [];
let cy = null;
let timelineSteps = [];
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

function showToast(message, type = "info", duration = 2400) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 220);
    }, duration);
}

function setTimeline(steps) {
    timelineSteps = [...steps];
    const list = document.getElementById("timelineList");
    if (!list) return;
    list.innerHTML = "";

    if (timelineSteps.length === 0) {
        const li = document.createElement("li");
        li.innerText = "No simulation steps yet.";
        list.appendChild(li);
        return;
    }

    timelineSteps.forEach(step => {
        const li = document.createElement("li");
        li.innerText = step;
        list.appendChild(li);
    });
}

function appendTimeline(step) {
    timelineSteps.push(step);
    setTimeline(timelineSteps);
}

function buildCyStyle() {
    const nodeColor = "#ff5c8a";
    const nodeBorder = "#ffe4f0";
    const edgeColor = "#3bc9db";
    const textColor = "#5a2e5f";
    const textBg = "#fff8ea";

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

function setResultMessage(message, stateClass = "state-info") {
    const resultEl = document.getElementById("result");
    resultEl.innerText = message;
    resultEl.classList.remove("state-info", "state-accepted", "state-rejected");
    resultEl.classList.add(stateClass);
}

function cleanInput(id) {
    return document.getElementById(id).value.trim();
}

function getSelectedMode() {
    const activeBtn = document.querySelector(".mode-btn.active");
    return activeBtn ? activeBtn.dataset.mode : "dfa";
}

function setMode(mode, { silent = false } = {}) {
    const dfaBtn = document.getElementById("modeDfaBtn");
    const nfaBtn = document.getElementById("modeNfaBtn");
    if (!dfaBtn || !nfaBtn) return;

    dfaBtn.classList.toggle("active", mode === "dfa");
    nfaBtn.classList.toggle("active", mode === "nfa");

    updateStats();
    updateDefinitionHighlight();
    setResultMessage("Mode changed. Run simulation again with current machine.", "state-info");
    if (!silent) {
        showToast("Mode changed.", "info");
    }
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
    const modeValue = getSelectedMode().toUpperCase();

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

function removeTransitionEntry(state, symbol) {
    if (!transitions[state] || !transitions[state][symbol]) return;
    delete transitions[state][symbol];
    if (Object.keys(transitions[state]).length === 0) {
        delete transitions[state];
    }
}

function applyTransitionEdit(state, symbol, rawInput) {
    const mode = getSelectedMode();
    const input = rawInput.trim();

    if (mode === "dfa") {
        if (!input || input === "-" || input === "{}") {
            removeTransitionEntry(state, symbol);
            return { ok: true, message: `Cleared transition ${state} on '${symbol}'.` };
        }
        if (!states.includes(input)) {
            return { ok: false, message: `State '${input}' does not exist.` };
        }
        if (!transitions[state]) transitions[state] = {};
        transitions[state][symbol] = [input];
        return { ok: true, message: `Updated ${state} --${symbol}--> ${input}` };
    }

    // NFA mode: comma-separated states, '{}'/'-' to clear
    if (!input || input === "{}" || input === "-") {
        removeTransitionEntry(state, symbol);
        return { ok: true, message: `Cleared transition set ${state} on '${symbol}'.` };
    }

    const parsed = input.split(",").map(s => s.trim()).filter(Boolean);
    if (parsed.length === 0) {
        removeTransitionEntry(state, symbol);
        return { ok: true, message: `Cleared transition set ${state} on '${symbol}'.` };
    }

    const invalid = parsed.find(s => !states.includes(s));
    if (invalid) {
        return { ok: false, message: `State '${invalid}' does not exist.` };
    }

    if (!transitions[state]) transitions[state] = {};
    transitions[state][symbol] = [...new Set(parsed)];
    return { ok: true, message: `Updated ${state} on '${symbol}' to {${transitions[state][symbol].join(", ")}}` };
}

function updateTransitionTable() {
    const titleEl = document.getElementById("transitionTableTitle");
    const hintEl = document.getElementById("transitionTableHint");
    const wrapEl = document.getElementById("transitionTableWrap");
    if (!titleEl || !hintEl || !wrapEl) return;

    const mode = getSelectedMode();
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
            cell.classList.add("editable-cell");
            cell.dataset.state = state;
            cell.dataset.symbol = symbol;
            const targets = transitions[state] && transitions[state][symbol]
                ? transitions[state][symbol]
                : [];
            const { text, className } = formatTransitionCell(mode, targets);
            cell.innerText = text;
            if (className) {
                cell.classList.add(className);
            }
            cell.title = "Click to edit transition";
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    wrapEl.innerHTML = "";
    wrapEl.appendChild(table);
}

function updateDefinitionHighlight() {
    const mode = getSelectedMode();
    document.getElementById("dfaCard").classList.toggle("active", mode === "dfa");
    document.getElementById("nfaCard").classList.toggle("active", mode === "nfa");
}

function viewDefinition() {
    const mode = getSelectedMode();
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
        showToast("Please enter a state name.", "error");
        return;
    }
    if (states.includes(state)) {
        showToast("State already exists!", "error");
        return;
    }
    states.push(state);
    updateStates();

    drawGraph();

    document.getElementById("stateName").value = "";
    showToast(`State '${state}' added.`, "success");
}

// Add Transition
function addTransition() {
    let from = cleanInput("fromState");
    let to = cleanInput("toState");
    let symbol = cleanInput("symbol").toLowerCase();

    if (!from || !to || !symbol) {
        showToast("Please fill all transition fields.", "error");
        return;
    }

    if (!states.includes(from) || !states.includes(to)) {
        showToast("State does not exist!", "error");
        return;
    }

    if (!transitions[from]) {
        transitions[from] = {};
    }

    if (!transitions[from][symbol]) {
        transitions[from][symbol] = [];
    }

    if (transitions[from][symbol].includes(to)) {
        showToast("Transition already exists!", "error");
        return;
    }

    transitions[from][symbol].push(to);

    updateTransitions();

    drawGraph();

    document.getElementById("fromState").value = "";
    document.getElementById("toState").value = "";
    document.getElementById("symbol").value = "";
    showToast(`Transition ${from} --${symbol}--> ${to} added.`, "success");
}

// Set Start State
function setStart() {
    const state = cleanInput("startState");
    if (!state) {
        showToast("Please enter a start state.", "error");
        return;
    }
    if (!states.includes(state)) {
        showToast("Start state must be an existing state.", "error");
        return;
    }
    startState = state;

    drawGraph();
    setResultMessage(`Start state set to ${state}.`, "state-info");
    showToast(`Start state set to ${state}.`, "success");
    updateStats();

}

// Add Final State
function setFinal() {
    let state = cleanInput("finalState");
    if (!state) {
        showToast("Please enter a final state.", "error");
        return;
    }
    if (!states.includes(state)) {
        showToast("Final state must be an existing state.", "error");
        return;
    }
    if (finalStates.includes(state)) {
        showToast("Final state already added.", "error");
        return;
    }
    finalStates.push(state);
    document.getElementById("finalState").value = "";

    drawGraph();
    setResultMessage(`Final state ${state} added.`, "state-info");
    showToast(`Final state ${state} added.`, "success");
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
    setTimeline([]);
    showToast("Machine reset.", "info");
    updateStats();
}


// Simulation
async function simulate() {
    let input = document.getElementById("inputString").value.toLowerCase();
    let mode = getSelectedMode();

    setTimeline([`Mode: ${mode.toUpperCase()}`, `Input: ${input || "(empty)"}`]);

    if (!startState) {
        showToast("Please set start state!", "error");
        return;
    }

    // DFA Mode
    if (mode === "dfa") {

        let current = startState;

        for (let char of input) {

            setResultMessage(`Reading: ${char}, Current State: ${current}`, "state-info");
            appendTimeline(`Read '${char}' at state ${current}`);

            await new Promise(r => setTimeout(r, 300));

            if (!transitions[current] || !transitions[current][char]) {
                setResultMessage("Rejected ❌", "state-rejected");
                appendTimeline(`No transition from ${current} on '${char}' -> Rejected`);
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
            appendTimeline(`Moved to ${current}`);
        }

        if (finalStates.includes(current)) {
            setResultMessage("Accepted ✅", "state-accepted");
            appendTimeline(`Final state ${current} reached -> Accepted`);
        } else {
            setResultMessage("Rejected ❌", "state-rejected");
            appendTimeline(`Stopped at ${current} (not final) -> Rejected`);
        }

    }

    // NFA Mode
    else {

        let currentStates = [startState];

        for (let char of input) {

            setResultMessage(`Reading: ${char}\nCurrent States: ${currentStates.join(", ")}`, "state-info");
            appendTimeline(`Read '${char}' from {${currentStates.join(", ")}}`);

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
                appendTimeline("No reachable states -> Rejected");
                return;
            }
            appendTimeline(`Next states: {${currentStates.join(", ")}}`);
        }

        // acceptance check
        let accepted = currentStates.some(state =>
            finalStates.includes(state)
        );

        setResultMessage(accepted ? "Accepted ✅" : "Rejected ❌", accepted ? "state-accepted" : "state-rejected");
        appendTimeline(accepted ? "At least one final state reached -> Accepted" : "No final state in reachable set -> Rejected");
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
    document.documentElement.removeAttribute("data-theme");
    localStorage.removeItem("fa-sim-theme");

    cy = cytoscape({
        container: document.getElementById('cy'),

        elements: [],

        style: buildCyStyle(),

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

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            hideDefinition();
        }
    });

    document.getElementById("definitionModal").addEventListener("click", event => {
        if (event.target.id === "definitionModal") {
            hideDefinition();
        }
    });

    document.getElementById("transitionTableWrap").addEventListener("click", event => {
        const cell = event.target.closest(".editable-cell");
        if (!cell) return;

        const { state, symbol } = cell.dataset;
        const current = transitions[state] && transitions[state][symbol]
            ? transitions[state][symbol]
            : [];
        const mode = getSelectedMode();
        const currentValue = mode === "dfa" ? (current[0] || "-") : (current.length ? current.join(", ") : "{}");
        const hint = mode === "dfa"
            ? `Edit ${state} on '${symbol}' (state name or '-' to clear)`
            : `Edit ${state} on '${symbol}' (comma-separated states or '{}' to clear)`;
        const nextInput = prompt(hint, currentValue);
        if (nextInput === null) return;

        const result = applyTransitionEdit(state, symbol, nextInput);
        if (!result.ok) {
            showToast(result.message, "error");
            return;
        }

        updateTransitions();
        drawGraph();
        showToast(result.message, "success");
    });

    updateStats();
    updateDefinitionHighlight();
    setTimeline([]);
    setMode("dfa", { silent: true });
}
