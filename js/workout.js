document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const dayNum = parseInt(params.get("day")) || 1;

    // load data
    const res = await fetch("../data/plans.json");
    const data = await res.json();

    const dayData = data.days.find(d => d.day === dayNum);
    if (!dayData) {
        console.error("Day not found:", dayNum);
        return;
    }

    // Rest day handling (replace page and stop further rendering)
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
        return; // stop — rest page doesn't need exercise rendering
    }

    // Title & summary
    const titleH1 = document.querySelector(".title h1");
    const titleSpan = document.querySelector(".title span");
    if (titleH1) titleH1.textContent = dayData.title;
    if (titleSpan) titleSpan.innerHTML = `${dayData.exercises.length} exercises  <i class="fas fa-clock ms-3 me-2"></i>${dayData.duration}`;

    // Per-day storage key
    const storageKey = `activeExercise-day-${dayNum}`;

    // Remove saved item if it doesn't belong to this day's exercises
    const lastActive = localStorage.getItem(storageKey);
    if (lastActive && !dayData.exercises.some(ex => ex.id === lastActive)) {
        localStorage.removeItem(storageKey);
    }

    // Sidebar and main elements
    const sidebar = document.getElementById("exercise-sidebar");
    const main = document.getElementById("exercise-main");
    if (!sidebar || !main) {
        console.error("Missing DOM targets: exercise-sidebar or exercise-main");
        return;
    }

    // Render sidebar (exercise list) + tips
    sidebar.innerHTML =
        dayData.exercises.map(ex => {
            const intensity = (ex.intensity || '').toLowerCase();
            let badgeClass = 'bg-success';
            if (intensity === 'medium') badgeClass = 'bg-warning';
            if (intensity === 'high') badgeClass = 'bg-danger';
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

    // Render main content (details)
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
    // Build sorted list of day numbers
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
                // No previous day exists, go back to dashboard
                window.location.href = '../Plans/workoutplan.html';
            }
        });
    }
});

