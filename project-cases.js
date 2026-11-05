document.querySelectorAll('[data-case]').forEach(card => {
    const openCase = () => document.getElementById(card.dataset.case).showModal();
    card.addEventListener('click', openCase);
    card.addEventListener('keydown', event => {
        // Native buttons already dispatch click for Enter and Space.
        if (card.tagName === 'BUTTON') return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openCase();
        }
    });
});

/* One visible page; existing dialogs remain the source of the complete cases. */
(() => {
    const book = document.querySelector('.cepsa-book');
    if (!book) return;
    const stack = book.querySelector('.cepsa-pages');
    const pages = [...stack.querySelectorAll('.cepsa-page')];
    const position = book.querySelector('.cepsa-position');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let current = 0;
    let turning = false;
    let queuedDirection = 0;
    let finishTurn = null;

    function show(index) {
        pages.forEach((page, number) => {
            const active = number === index;
            page.classList.toggle('is-current', active);
            page.inert = !active;
            page.setAttribute('aria-hidden', String(!active));
        });
        current = index;
        position.textContent = `${current + 1} / ${pages.length}`;
    }

    async function turn(direction) {
        if (turning) {
            // Coalesce rapid presses: finish this sheet, then honor the latest direction.
            queuedDirection = direction;
            return;
        }
        const next = (current + direction + pages.length) % pages.length;
        if (reduced.matches || !window.St?.PageFlip) {
            show(next);
            return;
        }
        turning = true;
        book.classList.add('is-turning');
        const forward = direction > 0;
        const width = book.clientWidth;
        const height = book.clientHeight;
        function snapshot(index) {
            const copy = book.cloneNode(true);
            copy.classList.remove('is-turning');
            copy.classList.add('cepsa-book-sheet');
            // A solid reverse separates projects instead of overlapping their text.
            if (index === next) copy.classList.add('cepsa-sheet-reverse');
            copy.removeAttribute('id');
            copy.querySelectorAll('[id], [aria-describedby]').forEach(element => {
                element.removeAttribute('id');
                element.removeAttribute('aria-describedby');
            });
            copy.querySelectorAll('.cepsa-page').forEach((page, number) => {
                page.classList.toggle('is-current', number === index);
            });
            copy.querySelector('.cepsa-position').textContent = (index + 1) + ' / ' + pages.length;
            copy.inert = true;
            copy.setAttribute('aria-hidden', 'true');
            copy.dataset.density = 'soft';
            return copy;
        }
        // Use the same outgoing-sheet sequence in both directions. Mirror its stage
        // for Previous so the current card peels from the left, not an incoming blank.
        const sheets = [snapshot(current), snapshot(next)];
        const viewport = document.createElement('div');
        viewport.className = 'cepsa-flip-viewport';
        viewport.setAttribute('aria-hidden', 'true');
        viewport.inert = true;
        const surface = document.createElement('div');
        surface.className = 'cepsa-flip-surface';
        if (!forward) surface.classList.add('cepsa-flip-backward');
        viewport.append(surface);
        surface.append(...sheets);
        book.append(viewport);
        const flip = new St.PageFlip(surface, {
            width, height, size: 'fixed', autoSize: false,
            usePortrait: true, showCover: false, drawShadow: true,
            maxShadowOpacity: .65, flippingTime: 1250,
            useMouseEvents: false, showPageCorners: false,
            startPage: 0
        });
        let timeout;
        try {
            await new Promise(resolve => {
                finishTurn = resolve;
                flip.on('changeState', event => {
                    if (event.data === 'read') resolve();
                });
                timeout = setTimeout(resolve, 2000);
                flip.on('init', () => {
                    flip.flipNext('bottom');
                });
                flip.loadFromHTML(sheets);
            });
            show(next);
            if (!reduced.matches) {
                // Let the opaque sheet settle, then reveal the new project underneath.
                const reveal = viewport.animate([{ opacity: 1 }, { opacity: 0 }], {
                    delay: 200, duration: 450, easing: 'ease-out', fill: 'forwards'
                });
                finishTurn = () => reveal.finish();
                await reveal.finished;
            }
        } finally {
            clearTimeout(timeout);
            finishTurn = null;
            show(next);
            flip.destroy();
            viewport.remove();
            book.classList.remove('is-turning');
            turning = false;
            const pending = queuedDirection;
            queuedDirection = 0;
            if (pending) turn(pending);
        }
    }

    function openCurrent() {
        if (!turning) document.getElementById(pages[current].dataset.dialog)?.showModal();
    }
    book.querySelectorAll('[data-cepsa-step]').forEach(button => {
        button.addEventListener('click', () => turn(Number(button.dataset.cepsaStep)));
    });
    book.querySelector('.cepsa-cover-link').addEventListener('click', openCurrent);
    book.addEventListener('click', event => {
        if (!event.target.closest('button, a, .cepsa-navigation')) openCurrent();
    });
    book.addEventListener('keydown', event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        turn(event.key === 'ArrowRight' ? 1 : -1);
    });
    reduced.addEventListener('change', () => {
        if (reduced.matches) finishTurn?.();
    });
    // The translation layer updates the permanent pages, including inactive ones.
    window.addEventListener('portfolio-language-change', () => {
        finishTurn?.();
    });
})();
