(() => {
  'use strict';

  const messagesEl = document.getElementById('messages');
  const form = document.getElementById('composerForm');
  const input = document.getElementById('composerInput');
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const menuToggle = document.getElementById('menuToggle');
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

    const ejemploWrap = root.querySelector('[data-role="ejemploWrap"]');
    if (fn.ejemplo && fn.ejemplo.length) {
      const ul = ejemploWrap.querySelector('[data-role="ejemplo"]');
      fn.ejemplo.forEach((l) => {
        const li = document.createElement('li');
        li.textContent = l;
        ul.appendChild(li);
      });
    } else { ejemploWrap.remove(); }

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

  async function ask(message) {
    addUserMessage(message);
    const typing = addAssistantTyping();
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      typing.remove();
      addAssistantAnswer(data.answer);
    } catch (err) {
      typing.remove();
      addAssistantAnswer({
        greeting: 'Ups.',
        body: 'Tuve un problema para responder tu consulta. Intenta de nuevo en un momento.',
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

  // ---------- Welcome message ----------
  addAssistantAnswer({
    greeting: '¡Hola! Soy ALLEXCEL.',
    body: 'Cuéntame qué necesitas lograr en tu Excel y te propongo qué fórmula usar, cómo combinarlas, o el paso a paso si quieres exportar a CSV, pasar tus datos a Power BI o cargarlos a un ERP.',
    items: [],
  });
})();
