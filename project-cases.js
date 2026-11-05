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
    let runningAnimations = [];

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
        if (reduced.matches || !Element.prototype.animate) {
            show(next);
            return;
        }
        turning = true;
        book.classList.add('is-turning');
        const forward = direction > 0;
        const sheet = pages[forward ? current : next].cloneNode(true);
        sheet.className = 'project-description cepsa-page cepsa-turn-sheet';
        sheet.removeAttribute('id');
        sheet.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
        sheet.querySelectorAll('[aria-describedby]').forEach(element => element.removeAttribute('aria-describedby'));
        sheet.inert = true;
        sheet.setAttribute('aria-hidden', 'true');
        sheet.style.transformOrigin = forward ? 'left center' : 'right center';
        const shade = document.createElement('span');
        shade.className = 'cepsa-page-shade';
        shade.style.background = `linear-gradient(${forward ? '90deg' : '270deg'}, #060c0988, transparent 90%)`;
        sheet.append(shade);
        stack.append(sheet);
        // Advancing exposes the new page below; returning lays the previous page on top.
        if (forward) show(next);
        const duration = 620;
        runningAnimations = [sheet.animate(forward ? [
            { transform: 'rotateY(0deg) skewY(0deg)', opacity: 1 },
            { transform: 'rotateY(-38deg) skewY(-1.8deg)', opacity: 1, offset: .55 },
            { transform: 'rotateY(-96deg) skewY(-2.5deg)', opacity: 0 }
        ] : [
            { transform: 'rotateY(96deg) skewY(2.5deg)', opacity: 0 },
            { transform: 'rotateY(38deg) skewY(1.8deg)', opacity: 1, offset: .45 },
            { transform: 'rotateY(0deg) skewY(0deg)', opacity: 1 }
        ], { duration, easing: 'cubic-bezier(.22,.7,.22,1)', fill: 'both' }),
        shade.animate(forward ? [{ opacity: 0 }, { opacity: .8 }] : [{ opacity: .8 }, { opacity: 0 }],
            { duration, easing: 'ease-in-out', fill: 'both' })];
        try {
            await Promise.all(runningAnimations.map(animation => animation.finished));
        } catch {
            // Finish on the intended page even when the browser cancels an animation.
        } finally {
            if (!forward) show(next);
            runningAnimations.forEach(animation => animation.cancel());
            runningAnimations = [];
            sheet.remove();
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
        if (reduced.matches) runningAnimations.forEach(animation => animation.finish());
    });
    // The translation layer updates the permanent pages, including inactive ones.
    window.addEventListener('portfolio-language-change', () => {
        runningAnimations.forEach(animation => animation.finish());
    });
})();
