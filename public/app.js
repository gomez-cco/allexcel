(() => {
  'use strict';

  const messagesEl = document.getElementById('messages');
  const form = document.getElementById('composerForm');
  const input = document.getElementById('composerInput');
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const menuToggle = document.getElementById('menuToggle');
  const newChatBtn = document.getElementById('newChatBtn');
  const fontUp = document.getElementById('fontUp');
  const fontDown = document.getElementById('fontDown');
  const themeToggle = document.getElementById('themeToggle');
  const categoryList = document.getElementById('categoryList');
  const guideList = document.getElementById('guideList');

  const tplFunction = document.getElementById('tpl-function-card');
  const tplGuide = document.getElementById('tpl-guide-card');

  // ---------- Accessibility: font scale ----------
  const MIN_SCALE = 0.85, MAX_SCALE = 1.45, STEP = 0.075;
  function applyFontScale(scale) {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    document.documentElement.style.setProperty('--font-scale', clamped.toFixed(3));
    try { localStorage.setItem('allexcel:fontScale', String(clamped)); } catch {}
  }
  (function initFontScale() {
    let saved = 1;
    try { saved = parseFloat(localStorage.getItem('allexcel:fontScale')) || 1; } catch {}
    applyFontScale(saved);
  })();
  fontUp.addEventListener('click', () => {
    const current = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--font-scale')) || 1;
    applyFontScale(current + STEP);
  });
  fontDown.addEventListener('click', () => {
    const current = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--font-scale')) || 1;
    applyFontScale(current - STEP);
  });

  // ---------- Theme ----------
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('allexcel:theme'); } catch {}
    const theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }
  initTheme();
  themeToggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('allexcel:theme', next); } catch {}
  });

  // ---------- Sidebar (mobile) ----------
  function openSidebar() {
    sidebar.classList.add('open');
    sidebarBackdrop.classList.add('show');
    menuToggle.setAttribute('aria-expanded', 'true');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('show');
    menuToggle.setAttribute('aria-expanded', 'false');
  }
  menuToggle.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  sidebarBackdrop.addEventListener('click', closeSidebar);

  // ---------- Messages ----------
  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addUserMessage(text) {
    const wrap = document.createElement('div');
    wrap.className = 'msg user';
    wrap.innerHTML = `<div class="bubble"></div>`;
    wrap.querySelector('.bubble').textContent = text;
    messagesEl.appendChild(wrap);
    scrollToBottom();
  }

  function buildFunctionCard(fn) {
    const node = tplFunction.content.cloneNode(true);
    const root = node.querySelector('.card-function');
    root.querySelector('[data-role="categoria"]').textContent = fn.categoria || '';
    root.querySelector('[data-role="name"]').textContent = fn.name;
    root.querySelector('[data-role="alias"]').textContent = fn.alias ? `(${fn.alias})` : '';
    root.querySelector('[data-role="quehace"]').textContent = fn.queHace || '';
    const sintaxisEl = root.querySelector('[data-role="sintaxis"]');
    if (fn.sintaxis) { sintaxisEl.textContent = fn.sintaxis; } else { sintaxisEl.remove(); }

    const argsWrap = root.querySelector('[data-role="argsWrap"]');
    if (fn.argumentos && fn.argumentos.length) {
      const ul = argsWrap.querySelector('[data-role="args"]');
      fn.argumentos.forEach((a) => {
        const li = document.createElement('li');
        li.textContent = a;
        ul.appendChild(li);
      });
    } else { argsWrap.remove(); }

    const pasoWrap = root.querySelector('[data-role="pasoAPasoWrap"]');
    const ejemploWrap = root.querySelector('[data-role="ejemploWrap"]');
    if (fn.pasoAPaso) {
      ejemploWrap.remove();

      const situacionEl = pasoWrap.querySelector('[data-role="situacion"]');
      if (fn.pasoAPaso.situacion) {
        situacionEl.textContent = fn.pasoAPaso.situacion;
      } else {
        situacionEl.remove();
      }

      const tablaWrap = pasoWrap.querySelector('[data-role="tablaWrap"]');
      if (fn.pasoAPaso.tabla) {
        const { columns, rows } = fn.pasoAPaso.tabla;
        const table = tablaWrap.querySelector('[data-role="tabla"]');
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        headRow.appendChild(document.createElement('th'));
        columns.forEach((c) => {
          const th = document.createElement('th');
          th.textContent = c;
          headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        rows.forEach((r) => {
          const tr = document.createElement('tr');
          const th = document.createElement('th');
          th.textContent = r.num;
          tr.appendChild(th);
          r.cells.forEach((c) => {
            const td = document.createElement('td');
            td.textContent = c;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
      } else {
        tablaWrap.remove();
      }

      const ol = pasoWrap.querySelector('[data-role="pasos"]');
      fn.pasoAPaso.steps.forEach((s) => {
        const li = document.createElement('li');
        const [label, desc] = s.split('\n');
        const strong = document.createElement('span');
        strong.className = 'step-label';
        strong.textContent = label;
        li.appendChild(strong);
        if (desc) {
          const small = document.createElement('span');
          small.className = 'step-desc';
          small.textContent = desc;
          li.appendChild(small);
        }
        ol.appendChild(li);
      });

      if (fn.pasoAPaso.explicacion) {
        pasoWrap.querySelector('[data-role="explicacion"]').textContent = fn.pasoAPaso.explicacion;
      } else {
        pasoWrap.querySelector('[data-role="explicacionWrap"]').remove();
      }

      if (fn.pasoAPaso.formulaCompleta) {
        pasoWrap.querySelector('[data-role="formulaCompleta"]').textContent = fn.pasoAPaso.formulaCompleta;
        if (fn.pasoAPaso.resultado) {
          pasoWrap.querySelector('[data-role="resultado"]').textContent = fn.pasoAPaso.resultado;
        } else {
          pasoWrap.querySelector('[data-role="resultadoWrap"]').remove();
        }
      } else {
        pasoWrap.querySelector('[data-role="formulaCompletaWrap"]').remove();
      }
    } else {
      pasoWrap.remove();
      if (fn.ejemplo && fn.ejemplo.length) {
        const ul = ejemploWrap.querySelector('[data-role="ejemplo"]');
        fn.ejemplo.forEach((l) => {
          const li = document.createElement('li');
          li.textContent = l;
          ul.appendChild(li);
        });
      } else {
        ejemploWrap.remove();
      }
    }

    if (fn.consejo) {
      root.querySelector('[data-role="consejo"]').textContent = fn.consejo;
    } else {
      root.querySelector('[data-role="consejoWrap"]').remove();
    }

    if (fn.variaciones) {
      root.querySelector('[data-role="variaciones"]').textContent = fn.variaciones;
    } else {
      root.querySelector('[data-role="variacionesWrap"]').remove();
    }

    return root;
  }

  function buildGuideCard(g) {
    const node = tplGuide.content.cloneNode(true);
    const root = node.querySelector('.card-guide');
    root.querySelector('[data-role="titulo"]').textContent = g.titulo;
    root.querySelector('[data-role="resumen"]').textContent = g.resumen || '';
    const ol = root.querySelector('[data-role="pasos"]');
    (g.pasos || []).forEach((p) => {
      const li = document.createElement('li');
      li.textContent = p;
      ol.appendChild(li);
    });
    if (g.consejo) {
      root.querySelector('[data-role="consejo"]').textContent = g.consejo;
    } else {
      root.querySelector('[data-role="consejoWrap"]').remove();
    }
    return root;
  }

  function addAssistantAnswer(answer) {
    const wrap = document.createElement('div');
    wrap.className = 'msg assistant';

    const stack = document.createElement('div');
    stack.className = 'assistant-stack';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = `${answer.greeting} ${answer.body}`.trim();
    stack.appendChild(bubble);

    if (answer.items && answer.items.length) {
      const cards = document.createElement('div');
      cards.className = 'cards';
      answer.items.forEach((item) => {
        cards.appendChild(item.type === 'guide' ? buildGuideCard(item) : buildFunctionCard(item));
      });
      stack.appendChild(cards);
    }

    if (answer.combo) {
      const combo = document.createElement('div');
      combo.className = 'combo-note';
      combo.textContent = answer.combo;
      stack.appendChild(combo);
    }

    wrap.appendChild(stack);
    messagesEl.appendChild(wrap);
    scrollToBottom();
  }

  function addAssistantTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'msg assistant';
    wrap.id = 'typingIndicator';
    wrap.innerHTML = '<div class="bubble">Pensando…</div>';
    messagesEl.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  // The free hosting tier "sleeps" the server after inactivity, so the first request
  // after a while can take up to ~50s to wake it up. Ping it as soon as the page loads
  // (before the user finishes reading/typing) so it's usually already awake by the time
  // they hit send, and let the typing indicator explain the delay if it isn't.
  function wakeServer() {
    fetch('/api/health', { cache: 'no-store' }).catch(() => {});
  }
  wakeServer();

  async function ask(message) {
    closeSidebar();
    addUserMessage(message);
    const typing = addAssistantTyping();

    const slowNotice = setTimeout(() => {
      const bubble = typing.querySelector('.bubble');
      if (bubble) bubble.textContent = 'Pensando… el servidor estaba dormido y está despertando, puede tardar hasta un minuto la primera vez.';
    }, 6000);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      clearTimeout(slowNotice);
      clearTimeout(timeoutId);
      typing.remove();
      addAssistantAnswer(data.answer);
    } catch (err) {
      clearTimeout(slowNotice);
      clearTimeout(timeoutId);
      typing.remove();
      const timedOut = err && err.name === 'AbortError';
      addAssistantAnswer({
        greeting: 'Ups.',
        body: timedOut
          ? 'El servidor está tardando más de lo normal en responder (puede estar despertando). Espera unos segundos y vuelve a enviar tu consulta.'
          : 'Tuve un problema de conexión para responder tu consulta. Revisa tu internet e intenta de nuevo.',
        items: [],
      });
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = 'auto';
    ask(text);
    closeSidebar();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 136) + 'px';
  });

  // ---------- Sidebar content ----------
  async function loadTopics() {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();

      data.guides.forEach((g) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = g.titulo;
        btn.addEventListener('click', () => ask(g.titulo));
        li.appendChild(btn);
        guideList.appendChild(li);
      });

      data.categories.forEach((c) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = `${c.num}. ${c.title}`;
        btn.addEventListener('click', () => ask(`¿Qué fórmulas de ${c.title} me sirven y cuándo usar cada una?`));
        li.appendChild(btn);
        categoryList.appendChild(li);
      });
    } catch (err) {
      /* sidebar is a convenience; a failed load just leaves it empty */
    }
  }
  loadTopics();

  // ---------- Welcome message / new conversation ----------
  function showWelcome() {
    messagesEl.innerHTML = '';
    addAssistantAnswer({
      greeting: '¡Hola! Soy GASPI, dime cómo te puedo ayudar.',
      body: 'Cuéntame qué necesitas lograr en tu Excel y te propongo qué fórmula usar, cómo combinarlas, o el paso a paso si quieres exportar a CSV, pasar tus datos a Power BI o cargarlos a un ERP.',
      items: [],
    });
  }

  newChatBtn.addEventListener('click', () => {
    showWelcome();
    input.value = '';
    input.style.height = 'auto';
    input.focus();
    closeSidebar();
  });

  showWelcome();
})();
