# Pulso Sano

Webapp (PWA) para móvil que ayuda a mantener la tensión arterial estable con ejercicio cardiovascular guiado, alimentación y seguimiento.

- **Perfil**: sexo, edad, peso, altura y nivel de actividad. Calcula IMC, frecuencia máxima, Zona 2, agua y calorías.
- **Ejercicios guiados y animados**: isométrico en pared o de mano, caminata (con GPS), bici, circuito de fuerza, respiración lenta y estiramientos, con temporizador, sonidos y vibración.
- **Tensión**: registro de sistólica, diastólica y pulso, clasificación (ESH 2023), gráfica, medias y exportación CSV.
- **Plan**: rutina diaria, semanal y mensual con progresión de 4 semanas.
- **Dieta**: patrón DASH mediterráneo, menú semanal y límites de sal.
- **Avisos**: ejercicio, agua, tensión, recorrido y pausas activas; exportables al calendario del móvil (.ics).

Sin dependencias ni compilación: HTML, CSS y JavaScript. Los datos se guardan solo en el dispositivo (`localStorage`).

## Uso

```bash
python3 -m http.server 8000
```

Para publicarla, activa GitHub Pages (Settings → Pages → Deploy from a branch) y ábrela en el móvil; desde el menú del navegador elige «Añadir a pantalla de inicio». Las notificaciones requieren HTTPS.

Orientación general; no sustituye el consejo médico.
