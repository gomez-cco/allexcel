# ALLEXCEL — by JJ

Asistente local (sin costo, sin API externa) que responde consultas en lenguaje natural sobre
qué fórmula de Excel usar, cómo combinarlas, y el paso a paso para exportar a CSV, pasar datos
a Power BI o cargarlos a un ERP.

## Qué incluye

- API en Node.js sin dependencias externas
- Frontend responsive (móvil y escritorio) servido desde el mismo backend
- Base de conocimiento estructurada a partir del manual propio (`data/kb_manual.json`,
  generado desde `Manual_Excel_Formulas.docx`): 12 categorías, 108 funciones
- Guías adicionales de autoría propia para procesos que el manual no cubre —Power Query y
  macros/VBA se marcan explícitamente como guía general, no como parte del manual—
  (`data/guides.json`): exportar a CSV, Power BI, ERP, Power Query, macros, calcular edad
- Motor de búsqueda + "humanización" de respuestas por reglas y sinónimos (`lib/engine.js`),
  sin llamadas a ningún servicio de IA externo
- Accesibilidad: control de tamaño de letra (A−/A+, persistente) y tema claro/oscuro con
  buen contraste entre fondo y texto, sin colores neón

## Cómo ejecutarlo

```powershell
node .\server.js
```

Luego abre [http://localhost:3000](http://localhost:3000).

## Estructura

- `server.js`: servidor HTTP y rutas de la API
- `lib/engine.js`: búsqueda por palabras clave/sinónimos y composición de la respuesta
- `data/kb_manual.json`: fórmulas extraídas del manual (categorías, sintaxis, ejemplos, tips)
- `data/guides.json`: procesos (CSV, Power BI, ERP, Power Query, macros, cálculo de edad)
- `public/`: interfaz (HTML/CSS/JS sin build, sin frameworks)

## Endpoints

- `POST /api/ask` — `{ "message": "texto de la consulta" }` → respuesta estructurada
- `GET /api/categories` — lista de categorías y guías para el panel lateral

## Notas y próximos pasos

- El motor es local y basado en reglas/palabras clave: cubre bien las consultas más
  frecuentes en español, pero no entiende lenguaje totalmente libre como lo haría una IA
  real vía API. Si más adelante se quiere ese nivel de flexibilidad, `lib/engine.js` es el
  único lugar que habría que cambiar (agregar una llamada a un modelo, manteniendo la misma
  función `composeAnswer(query)` como contrato).
- Para ampliar la base de fórmulas o corregir alguna, edita `data/kb_manual.json` o
  `data/guides.json` directamente (son JSON simple, no hace falta tocar código).
