/*---------------NAVIGATION BAR FUNCTION------------------*/
const navMenu = document.getElementById('myNavMenu');
const menuToggle = document.getElementById('menuToggle');
const hamburgerIcon = document.getElementById('hamburgerIcon');

function setMenuState(isOpen) {
    navMenu.classList.toggle('responsive', isOpen);
    menuToggle.setAttribute('aria-expanded', isOpen);
    menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    hamburgerIcon.className = isOpen ? 'uil uil-times' : 'uil uil-bars';
    document.body.classList.toggle('menu-open', isOpen);
}

menuToggle.addEventListener('click', () => {
    setMenuState(!navMenu.classList.contains('responsive'));
});

navMenu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => setMenuState(false));
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setMenuState(false);
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
    distance: '80px',
    duration: 2000,
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
    distance: '80px',
    duration: 2000,
    reset: true
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
    distance: '80px',
    duration: 2000,
    reset: true
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
    duration: 2000,
    reset: true
});
ScrollReveal().reveal('.H3Certi, .SPANCerti, .ACerti', {
    origin: 'bottom',
    distance: '100px',
    duration: 3000,
    delay: 300,
    reset: true
});
/*---------------SECTION PROJECT------------------*/
ScrollReveal().reveal('.project-container', {
    origin: 'left',
    distance: '80px',
    duration: 2000,
    reset: true
});
ScrollReveal().reveal('.project-container2', {
    origin: 'right',
    distance: '80px',
    duration: 2000,
    reset: true
});
/*---------------SECTION 3D MODEL------------------*/
ScrollReveal().reveal('#Model1', {
    origin: 'top',
    distance: '500px',
    duration: 2500,
    delay: 500,
    reset: true
});
ScrollReveal().reveal('#Model2', {
    origin: 'top',
    distance: '500px',
    duration: 2500,
    delay: 400,
    reset: true
});
ScrollReveal().reveal('#Model3', {
    origin: 'top',
    distance: '500px',
    duration: 2500,
    delay: 300,
    reset: true
});
ScrollReveal().reveal('#model-box3', {
    origin: 'top',
    distance: '500px',
    delay: 500,
    duration: 2500,
    reset: true
});
ScrollReveal().reveal('#model-box2', {
    origin: 'top',
    distance: '500px',
    duration: 2500,
    delay: 400,
    reset: true
});



/* ----- CHANGE ACTIVE LINK ----- */
const sections = document.querySelectorAll('section[id]');

function scrollActive() {
    const scrollY = window.scrollY;
    sections.forEach(current => {
        const sectionHeight = current.offsetHeight,
            sectionTop = current.offsetTop - 50,
            sectionId = current.getAttribute('id');
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            document.querySelector('.nav-menu a[href*="' + sectionId + '"]').classList.add('active-link');
        } else {
            document.querySelector('.nav-menu a[href*="' + sectionId + '"]').classList.remove('active-link');
        }
    });
}
window.addEventListener('scroll', scrollActive);

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
    elemento.addEventListener('click', function () {
        window.open(url, '_blank');
    });
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



document.getElementById('ver-mas-btn').addEventListener('click', function () {
    // Mostrar los contenedores ocultos
    document.querySelector('.project-container3').style.display = 'flex';
    document.querySelector('.project-container4').style.display = 'flex';
    document.querySelector('.project-container5').style.display = 'flex';

    // Ocultar el botón "Ver más"
    this.style.display = 'none';
    /*---------------SECTION PROJECT------------------*/
    ScrollReveal().reveal('.project-container3, .project-container5', {
        origin: 'left',
        distance: '80px',
        duration: 2000,
        reset: true
    });
    ScrollReveal().reveal('.project-container4', {
        origin: 'right',
        distance: '80px',
        duration: 2000,
        reset: true
    });
});

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

document.getElementById("DowloadCV").addEventListener("click", function() {
    var enlace = document.createElement('a');
    enlace.href = '';
    enlace.download = 'CV.pdf';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
});

document.getElementById("DowloadCVNav").addEventListener("click", function() {
    var enlace = document.createElement('a');
    enlace.href = '';
    enlace.download = 'CV.pdf';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
});
