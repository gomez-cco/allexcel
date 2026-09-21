'use strict';

const fs = require('fs');
const path = require('path');

const manual = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'kb_manual.json'), 'utf8'));
const guides = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'guides.json'), 'utf8'));

const STOPWORDS = new Set([
  'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'a', 'en', 'con',
  'para', 'por', 'que', 'como', 'se', 'su', 'sus', 'mi', 'mis', 'me', 'te', 'lo', 'le',
  'al', 'del', 'es', 'son', 'ser', 'esta', 'este', 'estos', 'estas', 'pero', 'si', 'no',
  'quiero', 'necesito', 'puedo', 'quisiera', 'hacer', 'tengo', 'tener', 'hola', 'buenas',
  'porfa', 'favor', 'ayuda', 'ayudame', 'dame', 'saber', 'sobre', 'cual', 'cuales', 'que',
  'calcular', 'calculo', 'obtener', 'lograr', 'usar', 'uso',
]);

// Curated synonym boosts: natural-language phrases -> function names (case-insensitive substring match on the query)
const SYNONYMS = [
  { match: ['buscar valor', 'buscar dato', 'traer dato', 'traer valor', 'cruzar datos', 'cruzar tabla', 'catalogo'], boost: ['BUSCARV', 'INDICE', 'COINCIDIR', 'BUSCARX'] },
  { match: ['buscar hacia la izquierda', 'buscar a la izquierda'], boost: ['INDICE', 'COINCIDIR', 'BUSCARX'] },
  { match: ['sumar si', 'sumar cuando', 'sumar condicion', 'sumar con condicion', 'total condicional', 'sumar por categoria', 'sumar filtrado'], boost: ['SUMAR.SI', 'SUMAR.SI.CONJUNTO'] },
  { match: ['contar si', 'contar cuantos', 'contar condicion', 'cuantas veces aparece', 'cuantos hay'], boost: ['CONTAR.SI', 'CONTAR.SI.CONJUNTO', 'CONTAR', 'CONTARA'] },
  { match: ['promedio si', 'promedio condicional', 'promedio por', 'promedio con varias condiciones', 'promedio con condiciones', 'promedio con mas de una condicion'], boost: ['PROMEDIO.SI', 'PROMEDIO.SI.CONJUNTO'] },
  { match: ['si entonces', 'entonces', 'de lo contrario', 'en caso contrario', 'si es mayor', 'si es menor', 'mayor que', 'menor que', 'mayor a', 'menor a', 'igual a', 'aprobado', 'rechazado', 'que diga', 'que muestre el texto', 'que marque'], boost: ['SI'] },
  { match: ['condicional', 'validar condicion', 'cumple una condicion', 'cumple varias condiciones', 'varias condiciones a la vez'], boost: ['SI', 'SI.CONJUNTO', 'Y', 'O'] },
  { match: ['manejar error', 'evitar error', 'que no muestre error', 'ocultar error'], boost: ['SI.ERROR', 'SI.ND'] },
  { match: ['unir texto', 'juntar texto', 'concatenar', 'combinar columnas de texto', 'combinar celdas de texto', 'unir el nombre', 'unir nombre y apellido', 'juntar nombre y apellido'], boost: ['CONCATENAR / CONCAT', 'UNIRCADENAS'] },
  { match: ['separar texto', 'extraer texto', 'sacar parte del texto', 'primeras letras', 'ultimas letras', 'encontrar texto dentro de'], boost: ['IZQUIERDA', 'DERECHA', 'EXTRAE', 'ENCONTRAR y HALLAR'] },
  { match: ['quitar espacios', 'espacios de mas', 'limpiar texto'], boost: ['ESPACIOS'] },
  { match: ['mayuscula', 'minuscula', 'primera letra mayuscula'], boost: ['MAYUSC', 'MINUSC', 'NOMPROPIO'] },
  { match: ['fecha de hoy', 'dia de hoy', 'dias entre fechas', 'diferencia de fechas', 'dias habiles'], boost: ['HOY', 'AHORA', 'DIAS', 'DIAS.LAB'] },
  { match: ['calcular edad', 'edad a partir de', 'fecha de nacimiento', 'antiguedad', 'antigüedad', 'años de servicio', 'años cumplidos', 'tiempo transcurrido'], boost: ['SIFECHA'] },
  { match: ['buscar valor en una sola fila', 'buscar en un solo rango', 'version simple de busqueda'], boost: ['BUSCAR'] },
  { match: ['voltear', 'transponer', 'invertir fila', 'invertir columna', 'de horizontal a vertical', 'de fila a columna'], boost: ['TRANSPONER'] },
  { match: ['multiplicar y sumar', 'cantidad por precio', 'total de una venta con varias filas'], boost: ['SUMAPRODUCTO'] },
  { match: ['celdas vacias', 'celdas vacías', 'valores vacios', 'valores vacíos', 'sin llenar', 'sin completar', 'datos pendientes'], boost: ['CONTAR.BLANCO'] },
  { match: ['texto antes de', 'texto despues de', 'separar por arroba', 'separar antes de un caracter', 'antes de la arroba', 'despues de la arroba'], boost: ['TEXTOANTES', 'TEXTODESPUES'] },
  { match: ['redondear', 'redondeo', 'redondea', 'quitar decimales', 'aproximar numero'], boost: ['REDONDEAR', 'REDONDEAR.MAS y REDONDEAR.MENOS'] },
  { match: ['el mas alto', 'el mayor', 'el mas bajo', 'el menor', 'maximo', 'minimo', 'mas alto', 'mas bajo'], boost: ['MAX y MIN'] },
  { match: ['duplicados', 'valores repetidos', 'esta repetido'], boost: ['CONTAR.SI'] },
  { match: ['convertir texto a numero', 'convertir numero a texto', 'formatear numero como texto'], boost: ['VALOR', 'TEXTO'] },
  { match: ['nomina', 'sueldo', 'liquidacion de sueldo'], boost: ['SUMAR.SI', 'SUMAR.SI.CONJUNTO', 'SI', 'DIAS.LAB'] },
  { match: ['prestamo', 'préstamo', 'cuota mensual', 'interes', 'interés', 'credito', 'crédito', 'pagar mensual', 'pago mensual', 'dividendo', 'financiar', 'cuanto voy a pagar', 'cuánto voy a pagar'], boost: ['PAGO', 'TASA', 'VA', 'VF'] },
];

// Generic intent rules: a root token + a contextual phrase together push a stronger boost
// than a literal phrase match, so natural phrasing/conjugations ("busco", "solo de") still land.
const INTENT_RULES = [
  {
    anyToken: ['buscar', 'busco', 'buscas', 'encontrar', 'encuentra', 'traer', 'trae'],
    anyPhrase: ['tabla', 'otra hoja', 'otra pestaña', 'lista', 'catalogo', 'catálogo', 'base de datos'],
    boost: ['BUSCARV', 'BUSCARH', 'INDICE', 'COINCIDIR', 'BUSCARX'],
    points: 16,
  },
  {
    anyToken: ['sumar', 'suma', 'total', 'vender', 'ventas', 'vendido', 'ingresos'],
    anyPhrase: ['solo', 'unicamente', 'únicamente', 'filtrad', 'condicion', 'condición', 'segun', 'según', 'donde', 'sucursal', 'region', 'región', 'zona', 'categoria', 'categoría', 'cliente', 'mes'],
    boost: ['SUMAR.SI', 'SUMAR.SI.CONJUNTO'],
    points: 14,
  },
  {
    anyToken: ['contar', 'cuantos', 'cuántos', 'cantidad'],
    anyPhrase: ['solo', 'unicamente', 'únicamente', 'filtrad', 'condicion', 'condición', 'segun', 'según', 'donde', 'sucursal', 'region', 'región', 'zona', 'categoria', 'categoría', 'cliente', 'mes'],
    boost: ['CONTAR.SI', 'CONTAR.SI.CONJUNTO'],
    points: 14,
  },
  {
    anyToken: ['promedio', 'media'],
    anyPhrase: ['solo', 'unicamente', 'únicamente', 'filtrad', 'condicion', 'condición', 'segun', 'según', 'donde'],
    boost: ['PROMEDIO.SI', 'PROMEDIO.SI.CONJUNTO'],
    points: 14,
  },
  {
    // "mas alt"/"mas baj" catches mayor/mayores/más alto/más alta regardless of gender/number.
    anyToken: ['segundo', 'segunda', 'tercero', 'tercera', 'cuarto', 'cuarta', 'ranking', 'posicion', 'posición'],
    anyPhrase: ['mas alt', 'más alt', 'mas baj', 'más baj', 'mayor', 'menor', 'ranking'],
    boost: ['K.ESIMO.MAYOR y K.ESIMO.MENOR'],
    points: 16,
  },
  {
    anyToken: ['unir', 'apilar', 'combinar', 'juntar', 'fusionar'],
    anyPhrase: ['tablas', 'rangos', 'listas', 'varias tablas', 'dos tablas'],
    boost: ['APILARV y APILARH'],
    points: 14,
  },
];

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function tokenize(query) {
  const norm = normalize(query);
  return norm
    .split(/[^a-z0-9.]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

// Flatten manual functions with their category context.
const FUNCTIONS = [];
for (const cat of manual.categories) {
  for (const fn of cat.functions) {
    FUNCTIONS.push({
      ...fn,
      categoria: cat.title,
      categoriaNum: cat.num,
      searchBlob: normalize([
        fn.name, fn.alias, cat.title, fn.queHace, fn.variaciones,
        (fn.argumentos || []).join(' '),
      ].join(' ')),
    });
  }
}

function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function hasWholeWord(haystack, word) {
  if (!word || word.length < 3) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegex(word)}($|[^a-z0-9])`).test(haystack);
}

function scoreFunction(fn, tokens, rawQueryNorm) {
  let score = 0;
  const nameNorm = normalize(fn.name);
  const aliasNorm = normalize(fn.alias);

  // Whole-word match only, so "sumar" in the query doesn't falsely credit "SUMA" (substring).
  if (hasWholeWord(rawQueryNorm, nameNorm)) score += 9;
  if (aliasNorm && hasWholeWord(rawQueryNorm, aliasNorm)) score += 7;

  for (const t of tokens) {
    if (nameNorm.includes(t)) score += 6;
    if (aliasNorm.includes(t)) score += 5;
    if (normalize(fn.categoria).includes(t)) score += 2;
    const occurrences = fn.searchBlob.split(t).length - 1;
    score += Math.min(occurrences, 3) * 1;
  }

  for (const syn of SYNONYMS) {
    if (syn.match.some((phrase) => rawQueryNorm.includes(normalize(phrase)))) {
      if (syn.boost.includes(fn.name)) score += 15;
    }
  }

  for (const rule of INTENT_RULES) {
    if (!rule.boost.includes(fn.name)) continue;
    const hasToken = rule.anyToken.some((w) => tokens.includes(w));
    const hasPhrase = rule.anyPhrase.some((w) => rawQueryNorm.includes(normalize(w)));
    if (hasToken && hasPhrase) score += rule.points;
  }

  return score;
}

function scoreGuide(guide, tokens, rawQueryNorm) {
  let score = 0;
  const titleNorm = normalize(guide.titulo);
  for (const tema of guide.temas) {
    const temaNorm = normalize(tema);
    if (rawQueryNorm.includes(temaNorm)) score += 14;
  }
  for (const t of tokens) {
    if (titleNorm.includes(t)) score += 4;
    if (guide.temas.some((tema) => normalize(tema).includes(t))) score += 3;
  }
  return score;
}

const FUNCTION_SCORE_THRESHOLD = 10;

function searchFunctions(query, topN = 3) {
  const tokens = tokenize(query);
  const rawQueryNorm = normalize(query);
  const scored = FUNCTIONS.map((fn) => ({ fn, score: scoreFunction(fn, tokens, rawQueryNorm) }))
    .filter((r) => r.score >= FUNCTION_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map((r) => r.fn);
}

const GUIDE_SCORE_THRESHOLD = 6;

function searchGuides(query, topN = 2) {
  const tokens = tokenize(query);
  const rawQueryNorm = normalize(query);
  const scored = guides.map((g) => ({ g, score: scoreGuide(g, tokens, rawQueryNorm) }))
    .filter((r) => r.score >= GUIDE_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map((r) => r.g);
}

const EXAMPLE_LABEL_RE = /^(Situación|Fórmula|Resultado|Explicación):?/;

function cleanExampleLines(lines) {
  // Keep only the meaningful narrative lines (Situación / Fórmula / Resultado / Explicación),
  // drop the raw mini-spreadsheet grid cells which don't read well outside a table.
  // The manual sometimes puts the label ("Fórmula: ") and its content (the formula itself)
  // on two separate paragraphs/lines — merge those back together so the formula isn't dropped.
  const keep = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!EXAMPLE_LABEL_RE.test(l)) continue;
    const hasInlineContent = /:\s*\S/.test(l);
    if (hasInlineContent) {
      keep.push(l);
    } else {
      const next = lines[i + 1];
      if (next !== undefined && !EXAMPLE_LABEL_RE.test(next)) {
        keep.push(`${l.trimEnd()} ${next}`.trim());
        i++;
      } else {
        keep.push(l);
      }
    }
  }
  return keep.length ? keep : lines.slice(0, 4);
}

// The manual represents each worked example's mini-spreadsheet as a flat run of cell
// texts: a leading row of column letters ("A","B"), then groups of (row number + one
// cell per column). Rebuild that into a real table so a beginner can see what a range
// like "A2:B4" actually contains, instead of just the range reference.
function parseMiniTable(rawLines) {
  const sitIdx = rawLines.findIndex((l) => /^Situación:/.test(l));
  const formIdx = rawLines.findIndex((l) => /^Fórmula:/.test(l));
  if (sitIdx === -1 || formIdx === -1 || formIdx <= sitIdx + 1) return null;
  const middle = rawLines.slice(sitIdx + 1, formIdx);

  let i = 0;
  const columns = [];
  while (i < middle.length && /^[A-Z]{1,2}$/.test(middle[i])) {
    columns.push(middle[i]);
    i += 1;
  }
  if (!columns.length) return null;

  const rows = [];
  while (i < middle.length && /^\d+$/.test(middle[i])) {
    const rowNum = middle[i];
    const cells = middle.slice(i + 1, i + 1 + columns.length);
    if (cells.length < columns.length) break;
    rows.push({ num: rowNum, cells });
    i += 1 + columns.length;
  }
  if (!rows.length || i !== middle.length) return null;

  return { columns, rows };
}

function splitTopLevelArgs(str) {
  const args = [];
  let depth = 0;
  let inQuotes = false;
  let current = '';
  for (const ch of str) {
    if (ch === '"') inQuotes = !inQuotes;
    if (!inQuotes) {
      if (ch === '(') depth += 1;
      else if (ch === ')') depth -= 1;
    }
    if (ch === ',' && depth === 0 && !inQuotes) {
      args.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim() !== '') args.push(current.trim());
  return args;
}

function parseArgDefs(argumentos) {
  return (argumentos || []).map((line) => {
    const m = /^\[?([^:\[\]]+)\]?\s*:\s*(.*)$/.exec(line);
    if (!m) return null;
    return { name: m[1].trim(), desc: m[2].trim() };
  }).filter(Boolean);
}

function bumpTrailingNumber(name, add) {
  return /\d+$/.test(name) ? name.replace(/\d+$/, (n) => String(Number(n) + add)) : `${name} ${add + 1}`;
}

// Some functions (SUMAR.SI.CONJUNTO, SI.CONJUNTO, ...) document a repeatable pair of
// arguments ("rango_criterio1 / criterio1: el primer par...") as a single definition
// covering two positions, with more pairs allowed. Expand that into one definition per
// actual position in the worked example, numbering extra pairs onward (2, 3, ...).
function expandArgDefs(argDefs, count) {
  const expanded = [];
  let lastPairParts = null;
  let lastPairDesc = '';
  for (const def of argDefs) {
    if (def.name.includes('/')) {
      lastPairParts = def.name.split('/').map((s) => s.trim());
      lastPairDesc = def.desc;
      lastPairParts.forEach((part) => expanded.push({ name: part, desc: def.desc }));
    } else {
      expanded.push(def);
    }
  }
  if (expanded.length < count && lastPairParts) {
    let extra = 0;
    while (expanded.length < count) {
      const part = lastPairParts[extra % lastPairParts.length];
      const repeatNum = Math.floor(extra / lastPairParts.length) + 1;
      expanded.push({ name: bumpTrailingNumber(part, repeatNum), desc: `${lastPairDesc} (par ${repeatNum + 1} de condiciones)` });
      extra += 1;
    }
  }
  return expanded;
}

// Turns a function's real worked example into an explicit, numbered, beginner-friendly
// walkthrough: one step per argument, using the concrete value from the example and the
// argument's plain-language description — instead of the abstract syntax alone.
function buildStepByStep(fn) {
  const clean = cleanExampleLines(fn.ejemplo || []);
  const formulaLine = clean.find((l) => /^Fórmula:\s*=/.test(l));
  const resultadoLine = clean.find((l) => /^Resultado:/.test(l));
  const situacionLine = clean.find((l) => /^Situación:/.test(l));
  const explicacionLine = clean.find((l) => /^Explicación:/.test(l));
  if (!formulaLine) return null;

  const formula = formulaLine.replace(/^Fórmula:\s*/, '').trim();
  const m = /^=\s*([A-Za-zÁÉÍÓÚÑ0-9._]+)\s*\((.*)\)\s*$/.exec(formula);
  if (!m) return null;

  const fnName = m[1];
  const innerArgs = splitTopLevelArgs(m[2]);
  if (!innerArgs.length) return null;

  const argDefs = expandArgDefs(parseArgDefs(fn.argumentos), innerArgs.length);
  const resultado = resultadoLine ? resultadoLine.replace(/^Resultado:\s*/, '').trim() : null;

  const steps = [];
  steps.push(`Escribe "=${fnName}(" en la celda donde quieres ver el resultado. Vas a completar ${innerArgs.length} dato${innerArgs.length > 1 ? 's' : ''} separados por comas.`);
  innerArgs.forEach((val, i) => {
    const def = argDefs[i];
    if (def) {
      steps.push(`"${def.name}" → escribe: ${val}\n${def.desc}`);
    } else {
      steps.push(`Escribe: ${val}`);
    }
  });
  steps.push(`Cierra el paréntesis con ")" y presiona Enter.${resultado ? ` El resultado es: ${resultado}` : ''}`);

  return {
    situacion: situacionLine ? situacionLine.replace(/^Situación:\s*/, '').trim() : null,
    tabla: parseMiniTable(fn.ejemplo || []),
    steps,
    formulaCompleta: formula,
    resultado,
    explicacion: explicacionLine ? explicacionLine.replace(/^Explicación:\s*/, '').trim() : null,
  };
}

const GREETINGS = [
  'Claro, te cuento.',
  'Buena pregunta, vamos por partes.',
  'Entiendo lo que necesitas, aquí va.',
  'Listo, esto es lo que te recomiendo.',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const KNOWN_COMBOS = new Set([
  ['INDICE', 'COINCIDIR'].sort().join('|'),
  ['BUSCARV', 'SI.ERROR'].sort().join('|'),
  ['BUSCARX', 'SI.ERROR'].sort().join('|'),
  ['SI', 'Y'].sort().join('|'),
  ['SI', 'O'].sort().join('|'),
  ['SI', 'SI.CONJUNTO'].sort().join('|'),
  ['CONCATENAR / CONCAT', 'TEXTO'].sort().join('|'),
  ['UNIRCADENAS', 'SI'].sort().join('|'),
  ['SUMAR.SI.CONJUNTO', 'SI'].sort().join('|'),
  ['CONTAR.SI.CONJUNTO', 'SI'].sort().join('|'),
]);

function toFunctionItem(fn, categoriaTitle) {
  return {
    type: 'function',
    name: fn.name,
    alias: fn.alias,
    categoria: categoriaTitle,
    queHace: fn.queHace,
    sintaxis: fn.sintaxis,
    argumentos: fn.argumentos,
    ejemplo: cleanExampleLines(fn.ejemplo),
    pasoAPaso: buildStepByStep(fn),
    consejo: fn.consejo.join(' '),
    variaciones: fn.variaciones,
  };
}

function findCategoryBrowseIntent(rawQueryNorm) {
  for (const cat of manual.categories) {
    const titleNorm = normalize(cat.title);
    if (
      rawQueryNorm.includes(`formulas de ${titleNorm}`)
      || rawQueryNorm.includes(`categoria de ${titleNorm}`)
      || rawQueryNorm.includes(`categoria: ${titleNorm}`)
    ) {
      return cat;
    }
  }
  return null;
}

function composeAnswer(query) {
  const q = (query || '').trim();
  if (!q) {
    return {
      greeting: '¡Hola! Soy GASPI, dime cómo te puedo ayudar.',
      body: 'Cuéntame qué necesitas lograr en tu Excel —por ejemplo "quiero sumar las ventas solo de la región norte" o "cómo paso mis datos a Power BI"— y te propongo la fórmula o el camino a seguir.',
      items: [],
    };
  }

  const browseCategory = findCategoryBrowseIntent(normalize(q));
  if (browseCategory) {
    return {
      greeting: pick(GREETINGS),
      body: `Estas son todas las fórmulas de ${browseCategory.title}. Abre "Argumentos" o "Ejemplo paso a paso" en la que te interese para ver el detalle:`,
      items: browseCategory.functions.map((fn) => toFunctionItem(fn, browseCategory.title)),
    };
  }

  const guideMatches = searchGuides(q, 2);
  const fnMatches = searchFunctions(q, 4);

  if (!guideMatches.length && !fnMatches.length) {
    return {
      greeting: pick(GREETINGS),
      body: `No logré identificar con claridad una fórmula o proceso para "${q}". ¿Puedes contarme con un poco más de detalle qué información tienes y qué resultado esperas obtener? Por ejemplo: qué columnas tiene tu tabla y qué quieres calcular o encontrar.`,
      items: [],
    };
  }

  const items = [];
  for (const g of guideMatches) {
    items.push({ type: 'guide', ...g });
  }
  for (const fn of fnMatches) {
    items.push(toFunctionItem(fn, fn.categoria));
  }

  let combo = '';
  if (fnMatches.length >= 2) {
    const [a, b] = fnMatches;
    const pairKey = [a.name, b.name].sort().join('|');
    if (KNOWN_COMBOS.has(pairKey)) {
      combo = `Si necesitas algo más completo, puedes combinar ${a.name} con ${b.name} en la misma fórmula para cubrir casos que una sola función no resuelve del todo.`;
    } else {
      combo = `${a.name} y ${b.name} resuelven necesidades parecidas: usa la que mejor se ajuste a tu caso, y si una se queda corta prueba con la otra.`;
    }
  }

  return {
    greeting: pick(GREETINGS),
    body: guideMatches.length && fnMatches.length
      ? `Para lo que describes, esto se resuelve en dos partes: el proceso a seguir y, si necesitas cálculos dentro de Excel antes de exportar, estas fórmulas te sirven.`
      : (guideMatches.length ? 'Esto se resuelve con un proceso paso a paso, más que con una sola fórmula:' : 'Estas son las fórmulas que mejor calzan con lo que buscas:'),
    items,
    combo,
  };
}

module.exports = { composeAnswer, searchFunctions, searchGuides, manual, guides, FUNCTIONS };
