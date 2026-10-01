# Propuesta 2 — evolución del portafolio original

Abre `/redesign/` en el servidor del proyecto. El principal permanece intacto.

Esta propuesta parte directamente de tu HTML y estilos originales. Mantiene el carbón, turquesa, amarillo, los botones azules, el logo flotante, el texto animado, los iconos y todas las secciones con sus contenidos en inglés.

## Qué cambia

- Inicio con mejor proporción entre texto e identidad, detalles flotantes y una franja de especialidades.
- Introducción personal y habilidades con superficies oscuras, herramientas organizadas y tipografía más legible.
- Trayectoria con el recorrido original, tarjetas más compactas y mejor contraste.
- Nueve certificaciones con altura uniforme, cabecera alineada y enlace al pie de cada tarjeta.
- Proyectos, Blender y video separados como en el principal: 14 proyectos, cinco modelos y tres trabajos de video. Las tarjetas vacías o pendientes se retiran. Cada sección usa una cuadrícula continua. Proyectos y certificaciones muestran inicialmente tres tarjetas, con botones Show more / Show less para desplegar o contraer las restantes. Los proyectos con información real pero sin enlace público se muestran sin inventar destinos.
- Habilidades ampliadas con React, TypeScript y SQL Server, además de Linux, AWS Lightsail y conocimientos básicos de Azure. La sección de servidores describe la configuración de Linux en Lightsail.
- Barra flotante con sección activa y menú móvil en dos columnas, fondo difuminado, acceso al CV, cierre con Escape y control del foco.
- Contacto con correo y teléfono reales, más una invitación a escribir. Se sustituye el formulario sin envío configurado.

## LEGO conservado

My Skills incluye AI & coding agents: OpenAI Codex y Google Gemini. Las nuevas habilidades usan iconos SVG locales en `icons/`, con procedencia documentada en `icons/README.md`.

Los mismos modelos Draco, luces, caras, descenso, búsqueda, telarañas y arrastre de la página. El segundo modelo conserva el saludo en inglés de diez segundos, el caminado y los giros. Los scripts adaptan únicamente las rutas y el inicio de esta propuesta.

La propuesta carga `../Assets/CSS/Style.css` y después `redesign.css`, con sus mejoras aisladas. `redesign.js` parte del comportamiento del principal; los proyectos utilizan sus enlaces reales.

Necesita un servidor HTTP y conexión para Three.js, las fuentes y los recursos externos. No se publica ni reemplaza el sitio principal.
