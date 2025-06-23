import { ManageAccount } from './FirebaseConf.js';

document.getElementById("form-sesion").addEventListener("submit", (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const account = new ManageAccount();
  account.authenticate(email, password);
  
});

console.log('Formulario de Inicio de Sesión');
