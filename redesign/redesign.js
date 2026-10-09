/* Scroll motion uses ScrollReveal for broad content and native observation for
   individual collection pieces. No section container retains opacity or transforms. */
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const activeMotion = new WeakMap();
const enteredMotion = new WeakMap();
const departingMotion = new WeakMap();

function playMotion(element, keyframes, delay = 0, duration = 820, fill = 'backwards') {
    if (motionPreference.matches || !element.animate) return;
    activeMotion.get(element)?.cancel();
    const animation = element.animate(keyframes, {
        duration, delay, fill, easing: 'cubic-bezier(.25,.75,.25,1)'
    });
    activeMotion.set(element, animation);
    animation.addEventListener('finish', () => {
        if (fill !== 'forwards' && activeMotion.get(element) === animation) activeMotion.delete(element);
    }, { once: true });
    animation.addEventListener('cancel', () => {
        if (activeMotion.get(element) === animation) activeMotion.delete(element);
    }, { once: true });
}

function motionPieces(item) {
    return item.classList.contains('credential-item')
        ? [item.querySelector('.credential-badge'), ...item.querySelector('.credential-copy').children]
        : item.classList.contains('gallery-card')
            ? [item.querySelector('.project-visual'), item.querySelector('.project-description')]
            : item.classList.contains('skill-group')
                ? [item.querySelector('.skill-route-node'), item.querySelector('.skill-content')]
            : [item];
}

function animateVisible(item, returning = false) {
    const pieces = motionPieces(item);
    const gallery = item.closest('#projects,#blender,#Video');
    const skillGroup = item.classList.contains('skill-group');
    const siblings = [...item.parentElement.children].filter(child => !child.hidden);
    const stagger = returning ? 0 : Math.min(siblings.indexOf(item) % 3, 2) * (gallery ? 65 : 45);
    pieces.filter(Boolean).forEach((piece, index) => {
        const badge = piece.classList.contains('credential-badge');
        const skillNode = piece.classList.contains('skill-route-node');
        const credentialText = piece.closest('.credential-copy');
        const visual = piece.classList.contains('project-visual');
        const origin = badge ? 'translateY(-16px) rotate(-2deg) scale(.96)'
            : skillNode ? 'translateX(-50%) scale(.78)'
            : skillGroup ? `translateX(${item.classList.contains('skill-group--left') ? '-18px' : '18px'})`
            : credentialText && piece.tagName === 'H3' ? 'translateX(12px)'
            : credentialText ? 'translateY(12px)'
            : visual && item.closest('#projects') ? 'translateX(-16px) scale(.98)'
            : visual ? 'translateY(-16px) scale(.98)'
            : 'translateY(10px)';
        const current = returning ? getComputedStyle(piece) : null;
        playMotion(piece, [
            { opacity: returning ? current.opacity : badge ? .6 : skillGroup ? .52 : .7,
              transform: returning ? current.transform : origin },
            { opacity: 1, transform: skillNode ? 'translateX(-50%)' : 'none' }
        ], stagger + index * (gallery ? 100 : 65), gallery ? 1120 : skillGroup ? 1020 : badge ? 950 : 820);
    });
}

function animateDeparting(item) {
    const gallery = item.closest('#projects,#blender,#Video');
    motionPieces(item).filter(Boolean).forEach((piece, index) => {
        const current = getComputedStyle(piece);
        const skillNode = piece.classList.contains('skill-route-node');
        playMotion(piece, [
            { opacity: current.opacity, transform: current.transform },
            { opacity: gallery ? .78 : item.classList.contains('skill-group') ? .82 : .72,
              transform: skillNode ? 'translateX(-50%) scale(.92)' : 'translateY(-8px)' }
        ], index * (gallery ? 70 : 35), gallery ? 900 : 760, 'forwards');
    });
}

const motionObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => entries.forEach(entry => {
        const item = entry.target;
        if (item.hidden) return;
        if (!entry.isIntersecting) {
            motionPieces(item).filter(Boolean).forEach(piece => activeMotion.get(piece)?.cancel());
            enteredMotion.set(item, false);
            departingMotion.set(item, false);
        } else if (entry.intersectionRatio >= .14) {
            if (departingMotion.get(item)) {
                departingMotion.set(item, false);
                animateVisible(item, true);
            } else if (!enteredMotion.get(item)) {
                enteredMotion.set(item, true);
                animateVisible(item);
            }
        } else if (enteredMotion.get(item) && !departingMotion.get(item)) {
            departingMotion.set(item, true);
            animateDeparting(item);
        }
    }), { threshold: [0, .14], rootMargin: '0px 0px 5% 0px' })
    : null;

document.querySelectorAll('.credential-item,.gallery-card,#about .skill-group').forEach(item => {
    motionObserver?.observe(item);
    item.addEventListener('focusin', () => {
        motionPieces(item).filter(Boolean).forEach(piece => activeMotion.get(piece)?.cancel());
        enteredMotion.set(item, true);
        departingMotion.set(item, false);
    });
});
motionPreference.addEventListener('change', () => {
    document.querySelectorAll('.credential-item,.gallery-card,#about .skill-group').forEach(item => {
        [item, ...item.querySelectorAll('*')].forEach(child => activeMotion.get(child)?.cancel());
    });
});

/* The existing ScrollReveal library adds restrained motion to standalone content. */
if (window.ScrollReveal && !motionPreference.matches) {
    ScrollReveal().reveal('.about-info,.journey-card,.contact-info,.contact-invite,.featured-text,.featured-image', {
        distance: '12px', duration: 850, interval: 55, opacity: .58,
        easing: 'cubic-bezier(.25,.75,.25,1)', reset: true,
        viewFactor: .08, mobile: true
    });
}

/* Keep three entries on phones and two desktop rows, with a reversible reveal. */
const compactCollections = window.matchMedia('(max-width: 600px)');
document.querySelectorAll('[data-collection-toggle]').forEach(button => {
    const grid = document.getElementById(button.dataset.collectionToggle);
    const items = [...grid.children];
    const noun = grid.id === 'certifications-grid' ? 'credentials' : 'projects';
    function syncCollection() {
        const expanded = button.getAttribute('aria-expanded') === 'true';
        const limit = compactCollections.matches ? 3 : 6;
        items.forEach((item, index) => {
            item.hidden = !expanded && index >= limit;
            if (item.hidden) {
                motionPieces(item).filter(Boolean).forEach(piece => activeMotion.get(piece)?.cancel());
                enteredMotion.set(item, false);
                departingMotion.set(item, false);
            }
            if (!item.hidden) motionObserver?.observe(item);
        });
        button.hidden = items.length <= limit;
        button.innerHTML = `${expanded ? 'Show fewer' : 'Show more'} ${noun} <i class="uil uil-angle-${expanded ? 'up' : 'down'}" aria-hidden="true"></i>`;
    }
    button.addEventListener('click', () => {
        button.setAttribute('aria-expanded', String(button.getAttribute('aria-expanded') !== 'true'));
        syncCollection();
    });
    compactCollections.addEventListener('change', syncCollection);
    syncCollection();
});

/* Draw a route through the actual milestone positions, so wrapping and resizing
   never leave the line detached from its nodes. */
const skillsRoute = document.getElementById('skillsRoute');
if (skillsRoute) {
    const routeSvg = skillsRoute.querySelector('.skill-route-svg');
    const track = skillsRoute.querySelector('.skill-route-track');
    const progressLine = skillsRoute.querySelector('.skill-route-progress');
    const nodes = [...skillsRoute.querySelectorAll('.skill-route-node')];
    const compactRoute = window.matchMedia('(max-width: 900px)');
    let routeLength = 0;
    let routeFrame = 0;

    function updateSkillsProgress() {
        if (!routeLength) return;
        const bounds = skillsRoute.getBoundingClientRect();
        const start = window.innerHeight * .78;
        const span = bounds.height + window.innerHeight * .12;
        const progress = motionPreference.matches ? 1 : Math.min(1, Math.max(0, (start - bounds.top) / span));
        progressLine.style.strokeDashoffset = String(routeLength * (1 - progress));
    }
    function requestSkillsProgress() {
        if (routeFrame) return;
        routeFrame = requestAnimationFrame(() => {
            routeFrame = 0;
            updateSkillsProgress();
        });
    }
    function layoutSkillsRoute() {
        const bounds = skillsRoute.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const positions = nodes.map(node => {
            const rect = node.getBoundingClientRect();
            return { x: rect.left + rect.width / 2 - bounds.left,
                y: rect.top + rect.height / 2 - bounds.top };
        });
        if (!positions.length) return;
        let path = `M ${positions[0].x} 0 L ${positions[0].x} ${positions[0].y}`;
        positions.slice(1).forEach((point, index) => {
            const previous = positions[index];
            const middle = (previous.y + point.y) / 2;
            path += compactRoute.matches
                ? ` L ${point.x} ${point.y}`
                : ` C ${previous.x} ${middle} ${point.x} ${middle} ${point.x} ${point.y}`;
        });
        path += ` L ${positions.at(-1).x} ${bounds.height}`;
        routeSvg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
        track.setAttribute('d', path);
        progressLine.setAttribute('d', path);
        routeLength = progressLine.getTotalLength();
        progressLine.style.strokeDasharray = String(routeLength);
        updateSkillsProgress();
    }
    new ResizeObserver(layoutSkillsRoute).observe(skillsRoute);
    window.addEventListener('scroll', requestSkillsProgress, { passive: true });
    window.addEventListener('resize', layoutSkillsRoute, { passive: true });
    motionPreference.addEventListener('change', updateSkillsProgress);
    layoutSkillsRoute();
}

/* A real counter, beginning when this version is published. Preview reads only. */
const countContainer = document.getElementById('visitorCounter');
const countValue = document.getElementById('visitorCount');
const previewHost = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);
const countUrl = 'https://counterapi.com/api/urielnunez.github.io/view/UrielFloresDev?unique=true' + (previewHost ? '&readOnly=true' : '');
fetch(countUrl, { cache: 'no-store' })
    .then(response => {
        if (!response.ok) throw new Error('Visitor count unavailable');
        return response.json();
    })
    .then(data => {
        if (!Number.isFinite(data.value)) return;
        countValue.textContent = new Intl.NumberFormat(document.documentElement.lang || 'en').format(data.value);
        countContainer.hidden = false;
    })
    .catch(() => { /* Keep the counter out of the layout when the service is offline. */ });

const navMenu = document.getElementById('myNavMenu');
const menuToggle = document.getElementById('menuToggle');
const hamburgerIcon = document.getElementById('hamburgerIcon');
const navBackdrop = document.getElementById('navBackdrop');
const pageContent = document.querySelector('main');
const pageFooter = document.querySelector('footer');

function setMenuState(isOpen) {
    navMenu.classList.toggle('responsive', isOpen);
    menuToggle.setAttribute('aria-expanded', isOpen);
    menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    hamburgerIcon.className = 'menu-lines';
    menuToggle.querySelector('.menu-toggle-label').textContent = isOpen ? 'Close' : 'Menu';
    document.body.classList.toggle('menu-open', isOpen);
    navBackdrop.hidden = !isOpen;
    pageContent.inert = isOpen;
    pageFooter.inert = isOpen;
}

navBackdrop.addEventListener('click', () => { setMenuState(false); menuToggle.focus(); });

menuToggle.addEventListener('click', () => {
    setMenuState(!navMenu.classList.contains('responsive'));
});

navMenu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => setMenuState(false));
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        setMenuState(false); menuToggle.focus();
    }
    if (event.key === 'Tab' && menuToggle.getAttribute('aria-expanded') === 'true') {
        const items = [...navMenu.querySelectorAll('a'), menuToggle];
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 1100) setMenuState(false);
});

/*---------------ADD SHADOW ON NAVIGATION BAR WHILE SROLLING------------------*/
window.onscroll = function () {
    headerShadow()
};

function headerShadow() {
    const navHeader = document.getElementById("header");

    if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
        navHeader.classList.add('is-scrolled');
    } else {
        navHeader.classList.remove('is-scrolled');
    }
}

/*---------------TYPING EFFECT------------------*/
if (typeof window.Typed === 'function' && !motionPreference.matches) new window.Typed(".typedText", {
    strings: [" Unity Developer", " Video Game Developer", " AR Developer", " Video Editor", " Web Developer", " VR Developer", " 3D Modeler", " YouTuber"],
    loop: true,
    typeSpeed: 100,
    backSpeed: 80,
    backDelay: 2000
});

/* ----- CHANGE ACTIVE LINK ----- */
const sections = document.querySelectorAll('section[id]');

function scrollActive() {
    const links = [...navMenu.querySelectorAll('.nav-link')];
    let active = links[0];
    links.forEach(link => {
        const target = document.getElementById(link.hash.slice(1));
        if (target && target.getBoundingClientRect().top <= 130) active = link;
    });
    links.forEach(link => {
        link.classList.toggle('active-link', link === active);
        if (link === active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
    });
}
window.addEventListener('scroll', scrollActive);
window.addEventListener('resize', scrollActive);
scrollActive();

// Selecciona todos los elementos con el atributo data-title
document.querySelectorAll('[data-title]').forEach(element => {
    // Obtiene el valor del atributo data-title
    let title = element.getAttribute('data-title');
    // Reemplaza el carácter especial | por un salto de línea
    title = title.replace('|', '  '); // Cambia '\n' por un espacio
    // Asigna el valor modificado al atributo data-title
    element.setAttribute('data-title', title);
});



//EVENTO Click para abrir un URL en otra pestaña
function abrirEnNuevaPestaña(idElemento, url) {
    const elemento = document.getElementById(idElemento);
    if (!elemento || !url) return;
    elemento.href = url;
    elemento.target = '_blank';
    elemento.rel = 'noopener noreferrer';
}
// Llamar a la función para cada elemento que deseas agregar el evento de clic
abrirEnNuevaPestaña('project1', 'https://youtube.com/shorts/gSRnQISudSc');
abrirEnNuevaPestaña('project2', 'https://youtube.com/shorts/illV7EX43V0');
abrirEnNuevaPestaña('project3', 'https://youtube.com/shorts/VUm09i6QVnI');
abrirEnNuevaPestaña('project4', 'https://youtube.com/shorts/I-UzIeOrLEM');
abrirEnNuevaPestaña('project5', 'https://youtube.com/shorts/xccC4h1vJyc');
abrirEnNuevaPestaña('Uproject1', 'https://youtu.be/KpOluCbwejo');
abrirEnNuevaPestaña('Uproject2', 'https://urielnunez.github.io/SanValentinVirtual/');
abrirEnNuevaPestaña('Uproject3', 'https://youtube.com/shorts/CEwqDqrnpFY');
abrirEnNuevaPestaña('Uproject4', 'https://youtube.com/shorts/beJROF9HkgU');
abrirEnNuevaPestaña('Uproject5', 'https://youtu.be/bd2rsa_CbWY');
abrirEnNuevaPestaña('Uproject6', 'https://youtu.be/6TZvvxwwaMo');
abrirEnNuevaPestaña('Uproject7', 'https://youtu.be/P97FeD85Css');
abrirEnNuevaPestaña('Uproject8', '');
abrirEnNuevaPestaña('Uproject9', 'https://youtu.be/AVCLFNbJQ58');
abrirEnNuevaPestaña('Uproject10', 'https://youtu.be/J0kA1nhzyYY');
abrirEnNuevaPestaña('Uproject11', 'https://urielnunez.github.io/UnityPortfolio/');

abrirEnNuevaPestaña('Uproject13', 'https://thebigday.mx/');
abrirEnNuevaPestaña('Uproject14', 'https://urielnunez.github.io/PortafolioWebAR/');


abrirEnNuevaPestaña('Uproject1-1', 'https://www.tiktok.com/@brandon_tavaresss');
abrirEnNuevaPestaña('Uproject2-1', 'https://www.instagram.com/carmenbauza_saludybelleza/');
abrirEnNuevaPestaña('Uproject3-1', 'https://www.youtube.com/@Quehubierapasadosioficial');



/*---------------PROFESSIONAL JOURNEY ROUTE------------------*/
const journeyMap = document.querySelector('.journey-map');

function updateJourneyRoute() {
    if (!journeyMap) return;
    const bounds = journeyMap.getBoundingClientRect();
    const start = window.innerHeight * .72;
    const distance = bounds.height + window.innerHeight * .22;
    const progress = Math.min(1, Math.max(0, (start - bounds.top) / distance));
    journeyMap.style.setProperty('--journey-progress', progress.toFixed(3));
}

if (journeyMap) {
    updateJourneyRoute();
    window.addEventListener('scroll', updateJourneyRoute, { passive: true });
    window.addEventListener('resize', updateJourneyRoute, { passive: true });
}

// Do not let the intro hide the proposal when a remote module is unavailable.
