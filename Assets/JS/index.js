import { ManageAccount } from './FirebaseConf.js';

document.getElementById("close").addEventListener("submit", (event) => {
  event.preventDefault();
  const account = new ManageAccount();
  account.signOut();
  
});

console.log('Cerrar sesion');