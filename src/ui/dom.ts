/** Tiny helper for building DOM without a framework. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | EventListener | undefined> = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (k === 'class') {
      el.className = String(v);
    } else if (k === 'html') {
      el.innerHTML = String(v);
    } else if (v === true) {
      el.setAttribute(k, '');
    } else {
      el.setAttribute(k, String(v));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

export function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function storageSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable (private mode); the app still works */
  }
}

export function storageDel(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Simple modal dialog. Resolves with the value of the clicked button. */
export function dialog<T extends string>(
  title: string,
  body: string | Node,
  buttons: { label: string; value: T; primary?: boolean }[],
): Promise<T | null> {
  return new Promise((resolve) => {
    const close = (v: T | null) => {
      overlay.remove();
      resolve(v);
    };
    const overlay = h(
      'div',
      { class: 'overlay', onclick: (e: Event) => e.target === overlay && close(null) },
      h(
        'div',
        { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('h2', {}, title),
        typeof body === 'string' ? h('p', {}, body) : body,
        h(
          'div',
          { class: 'modal-actions' },
          ...buttons.map((b) =>
            h('button', { class: b.primary ? 'btn primary' : 'btn', onclick: () => close(b.value) }, b.label),
          ),
        ),
      ),
    );
    document.body.append(overlay);
  });
}

export function toast(msg: string, ms = 2600) {
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, ms);
}
