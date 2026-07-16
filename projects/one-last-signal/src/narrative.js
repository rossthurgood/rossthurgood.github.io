/* All narrative copy + scroll timing lives here. Edit wording freely.
   `at` = GSAP timeline label + offset where the beat fades in.
   `hold` = timeline-units the text stays fully visible before fading out. */

export const NARRATIVE = [
    {
        id: "signal",
        at: "leaveEarth+=0.25",
        hold: 1.0,
        index: "01 / SIGNAL RECEIVED",
        text: "It reached us through the static — a voice from the far dark. Behind us, Earth is grey and silent. The engines fire one final time."
    },
    {
        id: "wreckage",
        at: "asteroids+=0.7",
        hold: 2.2,
        index: "02 / WHAT WE LEFT",
        text: "The wreckage of the old world drifts alongside us for a while. Cities, satellites, names. Then even the debris lets go."
    },
    {
        id: "planet1",
        at: "planet1Enter+=3.2",
        hold: 3.0,
        index: "03 / FIRST CANDIDATE",
        text: "Rock. No atmosphere. No answer to our call. We circle once, and move on.",
        tag: "UNINHABITABLE"
    },
    {
        id: "planet2",
        at: "planet2Enter+=3.2",
        hold: 3.0,
        index: "04 / THE GIANT",
        text: "A gas giant wrapped in storms. Something small orbits it, repeating a signal no instrument can decode.",
        tag: "UNINHABITABLE"
    },
    {
        id: "station",
        at: "stationEnter+=3.2",
        hold: 3.0,
        index: "05 / STATION ECHO",
        text: "A derelict station. Someone charted this region long before us. The logs are intact. The crew is not.",
        tag: "NO ONE REMAINS"
    },
    {
        id: "final",
        at: "finalEnter+=1.6",
        hold: 2.4,
        index: "06 / FINAL APPROACH",
        text: "The last candidate. The last of the fuel. Everything depends on what waits in this orbit."
    }
];

/* Ending copy — chosen by the procedural habitability roll. */
export function endingFor(metadata) {
    if (metadata.habitable) {
        return {
            title: "ONE LAST SIGNAL",
            line: "Green light. Water. Air. A place to begin again. Transmit the coordinates — one last signal home.",
            question: "They will come. Whatever is already here will be waiting."
        };
    }
    return {
        title: "ONE LAST SIGNAL",
        line: "The reading is cold. Nothing here will hold life. The signal window is closing.",
        question: "Do we send the truth — or send them hope?"
    };
}

/* Builds the DOM overlay. Returns { beats: Map<id, element>, ending: {...} } */
export function buildNarrativeOverlay(root, metadata) {
    const beats = new Map();

    NARRATIVE.forEach((beat) => {
        const el = document.createElement("div");
        el.className = "beat";
        el.setAttribute("data-testid", `beat-${beat.id}`);
        el.innerHTML = `
            <div class="beat-index">${beat.index}</div>
            <p class="beat-text">${beat.text}</p>
            ${beat.tag ? `<div class="beat-tag">${beat.tag}</div>` : ""}
        `;
        root.appendChild(el);
        beats.set(beat.id, el);
    });

    const ending = endingFor(metadata);
    const endEl = document.createElement("div");
    endEl.className = "ending";
    endEl.setAttribute("data-testid", "ending-panel");
    endEl.innerHTML = `
        <div class="ending-title">${ending.title}</div>
        <p class="ending-line ${metadata.habitable ? "habitable" : "hostile"}">${ending.line}</p>
        <p class="ending-question">${ending.question}</p>
        <div class="ending-meta" data-testid="ending-meta">
            SEED ${metadata.seed} &nbsp;//&nbsp; CLASS: ${metadata.biome.toUpperCase()} &nbsp;//&nbsp;
            <span class="${metadata.habitable ? "habitable" : "hostile"}">${metadata.habitable ? "HABITABLE" : "NOT HABITABLE"}</span>
        </div>
    `;
    root.appendChild(endEl);

    return { beats, endingEl: endEl };
}
