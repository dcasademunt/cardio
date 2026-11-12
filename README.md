# Pulso Sano

Webapp (PWA) para móvil que ayuda a mantener la tensión arterial estable con ejercicio cardiovascular guiado, alimentación y seguimiento.

- **Perfil**: sexo, edad, peso, altura y nivel de actividad. Calcula IMC, frecuencia máxima, Zona 2, agua y calorías.
- **Ejercicios guiados y animados**: isométrico en pared o de mano, caminata (con GPS), caminata por intervalos 3 + 3, bici, circuito de fuerza, movimiento lento tipo tai chi, respiración y estiramientos. Cada uno con su evidencia, esfuerzo objetivo y vídeos de técnica.
- **Tensión**: registro, clasificación, gráfica, medias y semana de control (protocolo 7-2-2), con exportación CSV.
- **Plan**: rutina diaria y semanal y programa de 12 semanas en tres fases, que se adapta a cómo valoras cada sesión.
- **Dieta**: raciones DASH según tus calorías con contador diario, menú de 14 días, sal oculta, cambios sencillos y lista de la compra.
- **Avisos**: ejercicio, agua, tensión, recorrido y pausas activas; exportables al calendario del móvil (.ics).

Fuentes principales: Edwards et al. (Br J Sports Med 2023), Nemoto et al. (Mayo Clin Proc 2007), plan DASH del NHLBI, guía ESC 2024 y protocolo de medida en casa 7-2-2. La lista completa con enlaces está en la app (Perfil → Ver fuentes científicas).

Sin dependencias ni compilación: HTML, CSS y JavaScript. Los datos se guardan solo en el dispositivo (`localStorage`).

## Uso

```bash
python3 -m http.server 8000
```

Para publicarla, activa GitHub Pages (Settings → Pages → Deploy from a branch) y ábrela en el móvil; desde el menú del navegador elige «Añadir a pantalla de inicio». Las notificaciones requieren HTTPS.

Orientación general; no sustituye el consejo médico.
