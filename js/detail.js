document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const dayNum = parseInt(params.get("day")) || 1;

    // Load data
    const res = await fetch("../data/detail-plans.json");
    const data = await res.json();
    const dayData = data.days.find(d => d.day === dayNum);
    if (!dayData) return console.error("Day not found:", dayNum);

    // Rest day handling
    if (dayData.type === 'rest') {
        const titleH1 = document.querySelector(".title h1");
        const titleSpan = document.querySelector(".title span");
        if (titleH1) titleH1.textContent = dayData.title;
        if (titleSpan) titleSpan.textContent = "";
        ["prev-day", "next-day"].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.style.display = "none";
        });

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
            </div>`;
        }
        return;
    }

    // Title & summary
    const titleH1 = document.querySelector(".title h1");
    const titleSpan = document.querySelector(".title span");
    if (titleH1) titleH1.textContent = dayData.title;

    const numExercises = dayData.exercises?.length || 0;
    const cardioList = Array.isArray(dayData.cardio) ? dayData.cardio : dayData.cardio ? [dayData.cardio] : [];
    const hasCardio = cardioList.length > 0;

    if (titleSpan) {
        titleSpan.innerHTML = `${numExercises} exercises${hasCardio ? ` + ${cardioList.length} cardio workout${cardioList.length > 1 ? 's' : ''}` : ''
            } <i class="fas fa-clock ms-3 me-2"></i>${dayData.duration || ''}`;

    }

    // Storage key
    const storageKey = `activeExercise-day-${dayNum}`;
    if (localStorage.getItem(storageKey) && !dayData.exercises.some(ex => ex.id === localStorage.getItem(storageKey)) &&
        !cardioList.some(c => c.id === localStorage.getItem(storageKey))) {
        localStorage.removeItem(storageKey);
    }

    const sidebar = document.getElementById("exercise-sidebar");
    const main = document.getElementById("exercise-main");
    if (!sidebar || !main) return;

    // Helper functions
    const parseSetsReps = (raw) => {
        if (!raw || typeof raw !== 'string') return '';
        const s = raw.trim();
        let m = s.match(/(\d+)\s*(?:sets?)?\s*(?:×|x)\s*(\d+)\s*(?:reps?)?/i);
        if (m) return `${m[1]} × ${m[2]}`;
        m = s.match(/(\d+)\s*sets?\D+?(\d+)\s*reps?/i); if (m) return `${m[1]} × ${m[2]}`;
        m = s.match(/(\d+)\s*(?:min|mins|minutes)/i); if (m) return `${m[1]} mins`;
        m = s.match(/(\d+)\s*sets?/i); if (m) return `${m[1]} sets`;
        m = s.match(/(\d+)\s*reps?/i); if (m) return `${m[1]} reps`;
        return s;
    };

    const getWeekNumber = (day) => Math.ceil(day / 7);
    const getCircuitLabel = (exList) => {
        for (const ex of exList) {
            const parsed = parseSetsReps(ex.sets);
            if (parsed?.includes('×')) return parsed;
        }
        for (const ex of exList) {
            const parsed = parseSetsReps(ex.sets);
            if (parsed) return parsed;
        }
        return dayData.duration || '';
    };

    const week = getWeekNumber(dayNum);
    const layoutOverride = dayData.layout?.toLowerCase();
    const useNewLayout = layoutOverride === 'new' || (layoutOverride !== 'old' && week >= 2);

    // Sidebar rendering
    const circuitCard = `
        <div class="circuit-card d-flex align-items-center justify-content-between p-3 rounded bg-dark">
            <div class="d-flex flex-column text-white">
                <span class="fw-bold fs-5" style="color:lime;">${numExercises} Exercises</span>
                <small class="text-white-50">Complete ${numExercises} exercises continuously</small>
                <small class="text-white-50 text-start">(Circuit Training)</small>
            </div>
            <div class="text-white text-center">
                <div class="fw-bold fs-4" style="color:lime;">${getCircuitLabel(dayData.exercises)}</div>
            </div>
        </div>`;

    const exerciseCards = dayData.exercises.map(ex => {
        const badgeClass = (ex.intensity || '').toLowerCase() === 'medium' ? 'bg-warning' : (ex.intensity || '').toLowerCase() === 'high' ? 'bg-danger' : 'bg-success';
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
            <div class="text-white fs-5"><span style="color:lime;">${parseSetsReps(ex.sets)}</span></div>
        </div>`;
    }).join('');



    // --- Cardio cards with unclickable heading ---
    let cardioCardsHTML = '';
    if (cardioList.length > 0) {
        // Add a heading card (unclickable)
        cardioCardsHTML += `
    <div class="exercise-card mt-4 p-3 rounded bg-dark text-center" style="cursor:default; pointer-events:none; color:lime;">
        <span class="fw-bold text-uppercase" style="letter-spacing:1px;">Cardio</span>
    </div>`;

        // Add each cardio item
        cardioCardsHTML += cardioList.map(c => {
            const intensity = (c.intensity || '').toLowerCase();
            const badgeClass =
                intensity === 'medium' ? 'bg-warning' :
                    intensity === 'high' ? 'bg-danger' :
                        'bg-success'; // low or default

            return `
        <div class="exercise-card d-flex align-items-center justify-content-between mt-3 p-3 rounded bg-dark" data-exercise="${c.id}">
            <div class="d-flex align-items-center gap-3 ms-3">
                <div class="video-container">
                    <video autoplay loop muted playsinline style="width:120px; border-radius:8px;">
                        <source src="${c.video}" type="video/webm">
                    </video>
                    <span class="badge ${badgeClass} d-block mt-1">${c.intensityBadge}</span>
                </div>
                <div class="d-flex flex-column">
                    <span class="exercise-name fw-bold text-white">${c.name}</span>
                    <small class="text-white-50">${c.heartRate || ''}</small>
                </div>
            </div>
            <div class="text-white fs-5">
                <span style="color:lime;">${parseSetsReps(c.sets)}</span>
            </div>
        </div>`;
        }).join('');
    }



    sidebar.innerHTML = (useNewLayout ? circuitCard : '') + exerciseCards + cardioCardsHTML + `
        <div class="suggestion-box mt-4 p-3 rounded bg-dark text-white-50">
            <h5 class="fw-bold text-white mb-2">
                <i class="fas fa-lightbulb me-2" style="color: lime;"></i>
                After-Workout Tips
            </h5>
            <p>${(dayData.tips || '').replace(/\n/g, '<br>')}</p>
        </div>`;

    // Main content rendering (exercises + cardio)
    main.innerHTML = [...dayData.exercises, ...cardioList].map(ex => `
        <div class="exercise-content text-center mt-5 d-none" data-exercise="${ex.id}">
            <video autoplay loop muted playsinline style="width:350px; border-radius:8px;">
                <source src="${ex.video}" type="video/webm">
            </video>
            <h2 class="text-white fs-2 fw-bold mt-3">${ex.name}</h2>
            <p class="text-white-50 fs-5 mt-4">${ex.description || ''}</p>
            ${ex.meta ? `
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
            </div>` : ''}
        </div>`).join('');

    // Activate first or saved exercise
    const cards = sidebar.querySelectorAll('.exercise-card');
    const contents = main.querySelectorAll('.exercise-content');
    let activeExercise = localStorage.getItem(storageKey) || (cards.length ? cards[0].dataset.exercise : null);

    const setActiveExercise = id => {
        if (!id) return;
        cards.forEach(c => c.classList.toggle('active', c.dataset.exercise === id));
        contents.forEach(c => c.classList.toggle('d-none', c.dataset.exercise !== id));
        localStorage.setItem(storageKey, id);
    };

    if (activeExercise) setActiveExercise(activeExercise);
    cards.forEach(card => card.addEventListener('click', () => setActiveExercise(card.dataset.exercise)));

    // Next / Previous navigation
    const sortedDays = data.days.map(d => d.day).sort((a, b) => a - b);
    const currentIndex = sortedDays.indexOf(dayNum);

    const nextBtn = document.getElementById('next-day');
    if (nextBtn) nextBtn.addEventListener('click', e => {
        e.preventDefault();
        const nextDay = sortedDays[currentIndex + 1];
        if (nextDay) {
            window.location.href = `index.html?day=${nextDay}`;
        } else {
            // Show Bootstrap modal instead of alert
            const modal = new bootstrap.Modal(document.getElementById('completionModal'));
            modal.show();
        }
    });


    const prevBtn = document.getElementById('prev-day');
    if (prevBtn) prevBtn.addEventListener('click', e => {
        e.preventDefault();
        const prevDay = sortedDays[currentIndex - 1];
        window.location.href = prevDay ? `index.html?day=${prevDay}` : '../Plans/workoutplan.html';
    });
});
