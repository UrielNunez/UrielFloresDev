/*---------------NAVIGATION BAR FUNCTION------------------*/
function menuFunction() {
    var menuBtn = document.getElementById("myNavMenu");

    if (menuBtn.className === "nav-menu") {
        menuBtn.className += " responsive ";
    } else {
        menuBtn.className = "nav-menu";
    }
}

/*---------------ADD SHADOW ON NAVIGATION BAR WHILE SROLLING------------------*/
window.onscroll = function () {
    headerShadow()
};

function headerShadow() {
    const navHeader = document.getElementById("header");

    if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
        navHeader.style.boxShadow = "0 5px 20px rgba(255, 255, 255, 0.1)";
        navHeader.style.height = "70px";
        navHeader.style.lineHeight = "70px";
    } else {
        navHeader.style.boxShadow = "none";
        navHeader.style.height = "90px";
        navHeader.style.lineHeight = "90px";
    }
}

/*---------------TYPING EFFECT------------------*/
var typingEffect = new Typed(".typedText", {
    strings: [" AR Developer", " VR Developer", " Designer", " YouTuber"],
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
    reset: true
});

/*---------------HOME------------------*/
sr.reveal('.featured-text-card', {});
sr.reveal('.featured-name', {delay: 100});
sr.reveal('.featured-text-info', {delay: 200});
sr.reveal('.featured-text-btn', {delay: 200});
sr.reveal('.social_icons', {delay: 200});
sr.reveal('.featured-image', {delay: 300});

/*---------------HEADINGS------------------*/
sr.reveal('.top-header',{});

/*---------------ABOUT INFO & CONTACT INFO------------------*/
const srLeft = ScrollReveal({
    origin: 'left',
    distance: '80px',
    duration: 2000,
    reset: true
});

srLeft.reveal('.about-info', {delay: 100});
srLeft.reveal('.contact-info', {delay: 100});

/*---------------ABOUT SKILLS & FORM BOX------------------*/
const srRight = ScrollReveal({
    origin: 'right',
    distance: '80px',
    duration: 2000,
    reset: true
});

srRight.reveal('.skills-box', {delay: 100});
srRight.reveal('.form-control', {delay: 100});

/*---------------PROJECT BOX------------------*/
srLeft.reveal('.project-box',{interval: 200})

/* ----- CHANGE ACTIVE LINK ----- */
const sections = document.querySelectorAll('section[id]')

function scrollActive() {
    const scrollY = window.scrollY;
    sections.forEach(current => {
        const sectionHeight = current.offsetHeight,
            sectionTop = current.offsetTop - 50,
            sectionId = current.getAttribute('id')
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            document.querySelector('.nav-menu a[href*=' + sectionId + ']').classList.add('active-link');
        } else {
            document.querySelector('.nav-menu a[href*=' + sectionId + ']').classList.remove('active-link');
        }
    })
}
window.addEventListener('scroll', scrollActive)

// Selecciona todos los elementos con el atributo data-title
document.querySelectorAll('[data-title]').forEach(element => {
    // Obtiene el valor del atributo data-title
    let title = element.getAttribute('data-title');
    // Reemplaza el carácter especial | por un salto de línea
    title = title.replace('|', '  '); // Cambia '\n' por un espacio
    // Asigna el valor modificado al atributo data-title
    element.setAttribute('data-title', title);
});
/*
//Evento OnClick() para acceder desde mi Project List a algun otro html
// Obtenemos el elemento con el ID 'project1'
const projectBoxLogIn = document.getElementById('project1');
// Agregamos un evento de clic al elemento
projectBoxLogIn.addEventListener('click', function() {
    // Redireccionamos al archivo index.html deseado
    window.location.replace ('./Login/SignUp.html');
    
});*/



const projectBoxLogIn = document.getElementById('project1');
projectBoxLogIn.addEventListener('click', function() {
    fetch('../Login/SignUp.html')
    .then(response => response.text())
    .then(html => {
        document.body.innerHTML = html;
    })
    .catch(error => console.error('Error al cargar el HTML:', error));
});
