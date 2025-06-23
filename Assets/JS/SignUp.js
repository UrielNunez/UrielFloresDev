// Importa la clase ManageAccount desde el archivo FirebaseConf.js
import { ManageAccount } from "./FirebaseConf.js";

// Agrega un event listener al formulario con id "form-Create" para el evento "submit"
document.getElementById("form-Create").addEventListener("submit", (event) => {
    // Previene el comportamiento por defecto del evento submit (enviar el formulario)
    event.preventDefault();

    // Obtiene los valores de email y password desde los elementos HTML con los respectivos ids
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    // Crea una instancia de la clase ManageAccount
    const account = new ManageAccount();

    // Llama al método register de la instancia account, pasando el email y la contraseña como parámetros
    account.register(email,password);
});

// Muestra un mensaje en la consola indicando que el usuario fue creado exitosamente
console.log("Usuario creado con éxito!");