document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.exercise-card');
    const contents = document.querySelectorAll('.exercise-content');

    // 1️⃣ Restore last active card from localStorage
    const lastExercise = localStorage.getItem('activeExercise');
    let activeCard;

    if (lastExercise) {
        activeCard = Array.from(cards).find(card => card.dataset.exercise === lastExercise);
    }

    if (!activeCard) {
        // If nothing stored, default to first card
        activeCard = cards[0];
    }

    // Set active card
    cards.forEach(c => c.classList.remove('active'));
    activeCard.classList.add('active');

    // Show only the corresponding main content
    const activeExercise = activeCard.dataset.exercise;
    contents.forEach(content => {
        if (content.dataset.exercise === activeExercise) {
            content.classList.remove('d-none');
        } else {
            content.classList.add('d-none');
        }
    });

    // 2️⃣ Add click events to all cards
    cards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove active from all cards
            cards.forEach(c => c.classList.remove('active'));

            // Add active to clicked card
            card.classList.add('active');

            // Show corresponding main content
            const exercise = card.dataset.exercise;
            contents.forEach(content => {
                if (content.dataset.exercise === exercise) {
                    content.classList.remove('d-none');
                } else {
                    content.classList.add('d-none');
                }
            });

            // Save the last active exercise in localStorage
            localStorage.setItem('activeExercise', exercise);
        });
    });
});
