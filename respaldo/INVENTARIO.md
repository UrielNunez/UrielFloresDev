# Inventario del respaldo

Este directorio conserva el portafolio que ocupaba la raíz antes de promover el diseño de `redesign/`. No es necesario para ejecutar el sitio actual. El archivo `MANIFIESTO.csv` identifica individualmente cada archivo del respaldo y explica su función.

| Ruta | Contenido y uso |
| --- | --- |
| `portafolio-anterior/index.html` | Página principal del portafolio anterior. Se puede abrir junto con su carpeta `Assets/` usando un servidor HTTP. |
| `portafolio-anterior/indexx.html` | Página de prueba para cerrar sesión. |
| `portafolio-anterior/Login.html` | Formulario de inicio de sesión del proyecto anterior. |
| `portafolio-anterior/ResetPassword.html` | Formulario de recuperación de contraseña. |
| `portafolio-anterior/SignUp.html` | Formulario de registro. |
| `portafolio-anterior/Assets/CSS/` | Estilos originales, incluidos `Style.css`, `Stylelogin.css` y un archivo `style` de prueba. El diseño nuevo conserva una copia de `Style.css` porque aún la usa. |
| `portafolio-anterior/Assets/JS/` | Scripts de la página anterior y de las pruebas de autenticación; no los carga el sitio nuevo. |
| `portafolio-anterior/Assets/Images/` | Todas las imágenes e iconos originales. Los que necesita el sitio nuevo también están copiados en la carpeta `Assets/Images/` de la raíz. |
| `portafolio-anterior/Assets/Models/` | Modelos y texturas originales. Los dos modelos Draco usados por el diseño nuevo también están copiados en `Assets/Models/`. |
| `animacion-blender/` | Archivos `.blend`, scripts de Blender, capturas, GIF y datos de revisión usados para preparar y corregir la animación del LEGO. Son fuentes de trabajo, no archivos web. |
| `archivos-no-publicados/experience.css` | Hoja de estilos auxiliar de una versión previa de la experiencia 3D; no estaba enlazada por el diseño final. |
| `archivos-no-publicados/experience.js` | Entrada auxiliar de una prueba anterior; el diseño final carga directamente `intro.js`. |
| `archivos-no-publicados/README-redesign-original.md` | Descripción histórica de la propuesta cuando aún vivía en `redesign/`; la guía vigente está en el `README.md` de la raíz. |
| `configuracion-editor/.vscode/settings.json` | Configuración local del editor; no afecta al sitio publicado. |
| `archivos-auxiliares/.DS_Store` y los archivos del mismo nombre dentro de `Assets/` | Metadatos creados por macOS; no forman parte de la página. |

Los recursos de `Assets/Images/` que no necesita el sitio nuevo quedaron únicamente en el respaldo: `MindAR.png`, `udemy (1) (1).svg`, `udemy (1).svg`, `udemy.png` y `VuforiaWhite.png`. Los modelos y texturas que no carga el nuevo diseño también quedaron allí, incluidos `lego-walker.glb`, `Player_Idle.fbx` y las texturas sueltas.
