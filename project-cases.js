document.querySelectorAll('[data-case]').forEach(card => {
    const openCase = () => document.getElementById(card.dataset.case).showModal();
    card.addEventListener('click', openCase);
    card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openCase();
        }
    });
});
