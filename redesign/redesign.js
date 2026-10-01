/*---------------NAVIGATION BAR FUNCTION------------------*/
document.querySelectorAll('[data-collection-toggle]').forEach(button => {
    const grid = document.getElementById(button.dataset.collectionToggle);
    if (!grid) return;
    const extraCards = Array.from(grid.children).slice(3);
    const label = button.querySelector('span');
    button.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') !== 'true';
        extraCards.forEach(card => { card.hidden = !expanded; });
        button.setAttribute('aria-expanded', String(expanded));
        label.textContent = expanded ? 'Show less' : `Show more (${extraCards.length})`;
        if (!expanded) button.scrollIntoView({ block: 'nearest', behavior: 'instant' });
        scrollActive();
    });
});

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
var typingEffect = new Typed(".typedText", {
    strings: [" Unity Developer", " Video Game Developer", " AR Developer", " Video Editor", " Web Developer", " VR Developer", " 3D Modeler", " YouTuber"],
    loop: true,
    typeSpeed: 100,
    backSpeed: 80,
    backDelay: 2000
});

/*---------------SCROLL ANIMATION------------------*/
const sr = ScrollReveal({
    origin: 'top',
    distance: '24px',
    duration: 700,
    reset: false
});

/*---------------HOME------------------*/
sr.reveal('.featured-text-card', {});
sr.reveal('.featured-name', {
    delay: 100
});
sr.reveal('.featured-text-info', {
    delay: 200
});

sr.reveal('.social_icons', {
    delay: 200
});
sr.reveal('.featured-image', {
    delay: 300
});
sr.reveal('.featured-text-btn', {
    delay: 200
});
/*---------------HEADINGS------------------*/
sr.reveal('.top-header', {});

/*---------------ABOUT INFO & CONTACT INFO------------------*/
const srLeft = ScrollReveal({
    origin: 'left',
    distance: '24px',
    duration: 700,
    reset: false
});

srLeft.reveal('.about-info', {
    delay: 100
});
srLeft.reveal('.contact-info', {
    delay: 100
});

/*---------------ABOUT SKILLS & FORM BOX------------------*/
const srRight = ScrollReveal({
    origin: 'right',
    distance: '24px',
    duration: 700,
    reset: false
});

srRight.reveal('.skills-info', {
    delay: 100
});
srRight.reveal('.form-control', {
    delay: 100
});
/*---------------SECTION Certification------------------*/
ScrollReveal().reveal('.IMGCertification', {
    origin: 'top',
    distance: '100px',
    duration: 700,
    reset: false
});
ScrollReveal().reveal('.H3Certi, .SPANCerti, .ACerti', {
    origin: 'bottom',
    distance: '100px',
    duration: 3000,
    delay: 300,
    reset: false
});
/*---------------SECTION PROJECT------------------*/
ScrollReveal().reveal('.project-container', {
    origin: 'left',
    distance: '24px',
    duration: 700,
    reset: false
});
ScrollReveal().reveal('.project-container2', {
    origin: 'right',
    distance: '24px',
    duration: 700,
    reset: false
});
/*---------------SECTION 3D MODEL------------------*/
ScrollReveal().reveal('#Model1', {
    origin: 'top',
    distance: '500px',
    duration: 2500,
    delay: 500,
    reset: false
});
ScrollReveal().reveal('#Model2', {
    origin: 'top',
    distance: '500px',
    duration: 2500,
    delay: 400,
    reset: false
});
ScrollReveal().reveal('#Model3', {
    origin: 'top',
    distance: '500px',
    duration: 2500,
    delay: 300,
    reset: false
});
ScrollReveal().reveal('#model-box3', {
    origin: 'top',
    distance: '500px',
    delay: 500,
    duration: 2500,
    reset: false
});
ScrollReveal().reveal('#model-box2', {
    origin: 'top',
    distance: '500px',
    duration: 2500,
    delay: 400,
    reset: false
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



document.querySelectorAll('.project-box').forEach(box => {
    box.addEventListener('touchstart', function() {
        // Removemos la clase 'touched' de todos los elementos
        document.querySelectorAll('.project-box').forEach(box => {
            box.classList.remove('touched');
        });
        // Añadimos la clase 'touched' solo al elemento que se tocó
        this.classList.add('touched');
    });
});

document.querySelectorAll('.image-container').forEach(box => {
    box.addEventListener('touchstart', function() {
        // Removemos la clase 'touched' de todos los elementos
        document.querySelectorAll('.image-container').forEach(box => {
            box.classList.remove('touched');
        });
        // Añadimos la clase 'touched' solo al elemento que se tocó
        this.classList.add('touched');
    });
});

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
