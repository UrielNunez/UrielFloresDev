const menu = document.querySelector('.menu-button');
const nav = document.querySelector('#nav');
menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
    menu.textContent = open ? 'Cerrar' : 'Menú';
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.textContent = 'Menú';
}));
const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); reveal.unobserve(entry.target); }
}), { threshold: .12 });
document.querySelectorAll('.reveal').forEach(item => reveal.observe(item));
document.querySelectorAll('.career-tab').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.career-tab,.career-entry').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    document.getElementById(button.dataset.entry).classList.add('active');
}));
