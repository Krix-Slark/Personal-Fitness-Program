document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const dayNum = parseInt(params.get("day")) || 1;

    // load data
    const res = await fetch("../data/detail-plans.json");
    const data = await res.json();

    const dayData = data.days.find(d => d.day === dayNum);
    if (!dayData) {
        console.error("Day not found:", dayNum);
        return;
    }

    // Rest day handling (unchanged)
    if (dayData.type === 'rest') {
        const titleH1 = document.querySelector(".title h1");
        const titleSpan = document.querySelector(".title span");
        if (titleH1) titleH1.textContent = dayData.title;
        if (titleSpan) titleSpan.textContent = "";

        const navPrev = document.getElementById('prev-day');
        const navNext = document.getElementById('next-day');
        if (navPrev) navPrev.style.display = 'none';
        if (navNext) navNext.style.display = 'none';

        const container = document.querySelector(".container-fluid");
        if (container) {
            container.outerHTML = `
            <div class="w-100 vh-100 d-flex flex-column justify-content-center align-items-center text-center bg-dark text-white p-4">
                <h1 class="display-4 mb-3" style="color:lime;">Rest Day 😊</h1>
                <p class="lead text-white-50 mb-4">
                    ${dayData.message || 'Take a break and let your muscles recover.'}
                </p>

                <a href="../Plans/workoutplan.html" class="btn btn-outline-success px-4 py-2 mt-2">
                    Back to Plan
                </a>
            </div>
            `;
        }
        return;
    }

    // Title & summary (unchanged)
    const titleH1 = document.querySelector(".title h1");
    const titleSpan = document.querySelector(".title span");
    if (titleH1) titleH1.textContent = dayData.title;
    if (titleSpan) titleSpan.innerHTML = `${dayData.exercises.length} exercises  <i class="fas fa-clock ms-3 me-2"></i>${dayData.duration}`;

    // Per-day storage key
    const storageKey = `activeExercise-day-${dayNum}`;

    // Clear invalid saved active
    const lastActive = localStorage.getItem(storageKey);
    if (lastActive && !dayData.exercises.some(ex => ex.id === lastActive)) {
        localStorage.removeItem(storageKey);
    }

    const sidebar = document.getElementById("exercise-sidebar");
    const main = document.getElementById("exercise-main");
    if (!sidebar || !main) {
        console.error("Missing DOM targets: exercise-sidebar or exercise-main");
        return;
    }

    /* ==============================
       Helper functions
       - parseSetsReps: normalize "5 sets × 6 reps" -> "5 × 6" or "10 mins"
       - week detection: determine week from dayNum
       - determine circuitSetsReps: choose first meaningful sets×reps across exercises
    =============================== */

    // parse sets string into display-friendly formats like "5 × 6" or "10 mins"
    function parseSetsReps(raw) {
        if (!raw || typeof raw !== 'string') return '';

        const s = raw.trim();

        // 1) common "5 sets × 6 reps" or "5 x 6 reps" or "5×6"
        let m = s.match(/(\d+)\s*(?:sets?)?\s*(?:×|x)\s*(\d+)\s*(?:reps?)?/i);
        if (m) return `${m[1]} × ${m[2]}`;

        // 2) "5 sets 6 reps" (space separated)
        m = s.match(/(\d+)\s*sets?\D+?(\d+)\s*reps?/i);
        if (m) return `${m[1]} × ${m[2]}`;

        // 3) minutes: "10 min", "10 mins", "10 minutes"
        m = s.match(/(\d+)\s*(?:min|mins|minutes)/i);
        if (m) return `${m[1]} mins`;

        // 4) single sets value "5 sets"
        m = s.match(/(\d+)\s*sets?/i);
        if (m) return `${m[1]} sets`;

        // 5) single reps value "6 reps"
        m = s.match(/(\d+)\s*reps?/i);
        if (m) return `${m[1]} reps`;

        // fallback: return trimmed original
        return s;
    }

    // get week number (week 1: days 1-7, week 2: days 8-14, ...)
    function getWeekNumber(day) {
        return Math.ceil(day / 7);
    }

    // choose a circuit card label by scanning exercises for the first "sets × reps" style
    function getCircuitLabel(exList) {
        // look for first that yields a "×" (sets × reps)
        for (const ex of exList) {
            const parsed = parseSetsReps(ex.sets);
            if (parsed && parsed.includes('×')) return parsed;
        }
        // no × found — fallback to first parsed sets or duration
        for (const ex of exList) {
            const parsed = parseSetsReps(ex.sets);
            if (parsed) return parsed;
        }
        // fallback to day duration (if any)
        if (dayData.duration) return dayData.duration;
        // last resort: blank
        return '';
    }

    // Decide whether to use the new layout:
    // - JSON override: dayData.layout === 'new' or 'old'
    // - else use week >= 2
    const week = getWeekNumber(dayNum);
    const layoutOverride = dayData.layout ? dayData.layout.toLowerCase() : null;
    const useNewLayout = (layoutOverride === 'new') || (layoutOverride !== 'old' && week >= 2); // ✅ WEEK 2 FIX

    /* ==============================
       Render the sidebar
    =============================== */

    if (useNewLayout) {
        // ✅ NEW: circuit card uses the first meaningful sets×reps we find across exercises
        const circuitSetsReps = getCircuitLabel(dayData.exercises);

        const circuitCard = `
            <div class="circuit-card d-flex align-items-center justify-content-between p-3 rounded bg-dark">
                <div class="d-flex flex-column text-white">
                    <span class="fw-bold fs-5" style="color:lime;">${dayData.exercises.length} Exercises</span>
                    <small class="text-white-50">Complete ${dayData.exercises.length} exercises continuously</small>
                    <small class="text-white-50 text-start">(Circuit Training)</small>
                </div>
                <div class="text-white text-center">
                    <div class="fw-bold fs-4" style="color:lime;">
                        ${circuitSetsReps}
                    </div>
                </div>
            </div>
        `;

        // build exercise cards with parsed sets display
        const exerciseCards = dayData.exercises.map(ex => {
            const intensity = (ex.intensity || '').toLowerCase();
            let badgeClass = 'bg-success';
            if (intensity === 'medium') badgeClass = 'bg-warning';
            if (intensity === 'high') badgeClass = 'bg-danger';
            if (intensity === 'low') badgeClass = 'bg-success';

            const displaySets = parseSetsReps(ex.sets);

            return `
            <div class="exercise-card d-flex align-items-center justify-content-between mt-3 p-3 rounded bg-dark" data-exercise="${ex.id}">
                <div class="d-flex align-items-center gap-3 ms-3">
                    <div class="video-container">
                        <video autoplay loop muted playsinline style="width:120px; border-radius:8px;">
                            <source src="${ex.video}" type="video/webm">
                        </video>
                        <span class="badge ${badgeClass} d-block mt-1">${ex.intensityBadge}</span>
                    </div>
                    <div class="d-flex flex-column">
                        <span class="exercise-name fw-bold text-white">${ex.name}</span>
                        <small class="text-white-50">${ex.heartRate || ''}</small>
                    </div>
                </div>
                <div class="text-white me-4 fs-5">
                    <span style="color:lime;">${displaySets}</span>
                </div>
            </div>`;
        }).join('');

        sidebar.innerHTML = circuitCard + exerciseCards + `
            <div class="suggestion-box mt-4 p-3 rounded bg-dark text-white-50">
                <h5 class="fw-bold text-white mb-2">
                    <i class="fas fa-lightbulb me-2" style="color: lime;"></i>
                    After-Workout Tips
                </h5>
                <p>${(dayData.tips || '').replace(/\n/g, '<br>')}</p>
            </div>
        `;

    } else {
        // Old style (week 1 or explicit old layout)
        sidebar.innerHTML =
            dayData.exercises.map(ex => {
                const intensity = (ex.intensity || '').toLowerCase();
                let badgeClass = 'bg-success';
                if (intensity === 'medium') badgeClass = 'bg-warning';
                if (intensity === 'high') badgeClass = 'bg-danger';
                if (intensity === 'low') badgeClass = 'bg-success';

                // keep previous simple sets text for week1
                return `
            <div class="exercise-card d-flex align-items-center justify-content-between mt-3 p-3 rounded bg-dark" data-exercise="${ex.id}">
                <div class="d-flex align-items-center gap-3 ms-3">
                    <div class="video-container">
                        <video autoplay loop muted playsinline style="width:120px; border-radius:8px;">
                            <source src="${ex.video}" type="video/webm">
                        </video>
                        <span class="badge ${badgeClass} d-block mt-1">${ex.intensityBadge}</span>
                    </div>
                    <span class="exercise-name fw-bold text-white">${ex.name}</span>
                </div>
                <div class="text-white me-4 fs-5">
                    <span style="color:lime;">${ex.sets}</span>
                </div>
            </div>`;
            }).join('') +
            `
        <div class="suggestion-box mt-4 p-3 rounded bg-dark text-white-50">
            <h5 class="fw-bold text-white mb-2">
                <i class="fas fa-lightbulb me-2" style="color: lime;"></i>
                After-Workout Tips
            </h5>
            <p>${(dayData.tips || '').replace(/\n/g, '<br>')}</p>
        </div>
        `;
    }

    // Render main content (unchanged)
    main.innerHTML = dayData.exercises.map(ex => `
        <div class="exercise-content text-center mt-5 d-none" data-exercise="${ex.id}">
            <video autoplay loop muted playsinline style="width:350px; border-radius:8px;">
                <source src="${ex.video}" type="video/webm">
            </video>
            <h2 class="text-white fs-2 fw-bold mt-3">${ex.name}</h2>
            <p class="text-white-50 fs-5 mt-4">${ex.description}</p>
            <div class="container row d-flex justify-content-center align-items-center mt-4 gap-3 p-0 mb-4">
                ${ex.meta.map(m => `
                <div class="col-12 col-md-3">
                    <div class="card bg-dark text-white">
                        <div class="card-body">
                            <i class="fas fa-bullseye mb-3" style="color: lime;"></i>
                            <h5 class="card-title text-white-50">${m.title}</h5>
                            <p class="card-text text-white fw-bold">${m.value}</p>
                        </div>
                    </div>
                </div>`).join('')}
            </div>
        </div>`).join("");

    // Query rendered DOM for cards/contents
    const cards = sidebar.querySelectorAll('.exercise-card');
    const contents = main.querySelectorAll('.exercise-content');

    // Determine active exercise: prefer per-day saved value, fall back to first card
    const saved = localStorage.getItem(storageKey);
    const initial = saved || (cards.length ? cards[0].dataset.exercise : null);
    let activeExercise = initial;

    function setActiveExercise(id) {
        if (!id) return;
        cards.forEach(c => c.classList.toggle('active', c.dataset.exercise === id));
        contents.forEach(c => c.classList.toggle('d-none', c.dataset.exercise !== id));
        localStorage.setItem(storageKey, id);
    }

    if (activeExercise) setActiveExercise(activeExercise);

    cards.forEach(card => {
        card.addEventListener('click', () => setActiveExercise(card.dataset.exercise));
    });

    /* ----------  Next / Previous Day (safe) ---------- */
    const sortedDays = data.days.map(d => d.day).sort((a, b) => a - b);
    const currentIndex = sortedDays.indexOf(dayNum);

    const nextBtn = document.getElementById('next-day');
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const nextDayNumber = (currentIndex >= 0 && currentIndex < sortedDays.length - 1) ? sortedDays[currentIndex + 1] : null;
            if (nextDayNumber) {
                window.location.href = `index.html?day=${nextDayNumber}`;
            } else {
                alert("You have completed all the days!");
            }
        });
    }

    const prevBtn = document.getElementById('prev-day');
    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const prevDayNumber = (currentIndex > 0) ? sortedDays[currentIndex - 1] : null;
            if (prevDayNumber) {
                window.location.href = `index.html?day=${prevDayNumber}`;
            } else {
                window.location.href = '../Plans/workoutplan.html';
            }
        });
    }
});
