/* A single entrance / exit rhythm for sections and cards. */
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const animations = new Set();
const visibleState = new WeakMap();
let previousScrollY = window.scrollY;
let scrollDirection = 1;
window.addEventListener('scroll', () => {
    const current = window.scrollY;
    if (Math.abs(current - previousScrollY) > 3) scrollDirection = current > previousScrollY ? 1 : -1;
    previousScrollY = current;
}, { passive: true });

function animateItem(element, entering, delay = 0) {
    if (motionPreference.matches || !element.animate) return;
    element.getAnimations().forEach(animation => animation.cancel());
    const offset = element.closest('#certifications')
        ? `translateY(${element.classList.contains('credential-top') ? -20 : 16}px)`
        : element.closest('#projects') ? `translateX(${24 * scrollDirection}px)`
        : element.closest('#blender') ? 'translateY(-24px)' : `translateY(${14 * scrollDirection}px)`;
    const from = entering
        ? { opacity: .18, transform: offset }
        : { opacity: 1, transform: 'translateY(0)' };
    const to = entering
        ? { opacity: 1, transform: 'translateY(0)' }
        : { opacity: .35, transform: offset };
    const animation = element.animate([from, to], {
        duration: entering ? 480 : 320,
        delay: entering ? delay : 0,
        easing: 'cubic-bezier(.2,.7,.2,1)',
        fill: 'forwards'
    });
    animations.add(animation);
    animation.oncancel = () => animations.delete(animation);
    animation.onfinish = () => {
        if (entering) animation.cancel();
    };
}
function motionContents(item) {
    return item.matches('.gallery-card,.credential-card') ? [...item.children] : [item];
}
const motionObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => entries.forEach(entry => {
        const item = entry.target;
        if (item.hidden) return;
        const entering = entry.isIntersecting && entry.intersectionRatio >= .12;
        const prior = visibleState.get(item);
        if (prior === entering || (prior === undefined && !entering)) return;
        visibleState.set(item, entering);
        const group = [...item.parentElement.children].filter(child => !child.hidden);
        const delay = Math.min(group.indexOf(item) % 3, 2) * 45;
        motionContents(item).forEach(child => animateItem(child, entering, delay));
    }), { threshold: [0, .02, .12], rootMargin: '-3% 0px -3% 0px' })
    : null;
function observeMotion(item) {
    motionObserver?.observe(item);
    item.addEventListener('focusin', () => {
        visibleState.set(item, true);
        motionContents(item).forEach(child => child.getAnimations().forEach(animation => animation.cancel()));
    });
}
document.querySelectorAll('.gallery-card,.credential-card,.top-header,.about-info,.skill-group,.journey-card,.contact-info,.contact-invite,.featured-text,.featured-image').forEach(observeMotion);
motionPreference.addEventListener('change', () => {
    animations.forEach(animation => animation.cancel());
    animations.clear();
});

/* Each skill family remains visible in a single, scannable toolkit. */
const toolkit = document.querySelector('#about .skills-info');
toolkit.classList.add('is-expanded');

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
