(() => {
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const escapeHtml = (str) =>
    String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  const createTag = (label) => {
    const el = document.createElement('span');
    el.className = 'tag';
    el.textContent = label;
    return el;
  };

  const setText = (el, value) => {
    if (!el) return;
    el.textContent = value ?? '';
  };

  const setHref = (el, href) => {
    if (!el) return;
    if (!href) {
      el.setAttribute('href', '#');
      el.setAttribute('aria-disabled', 'true');
      return;
    }
    el.removeAttribute('aria-disabled');
    el.setAttribute('href', href);
  };

  const setupYear = () => {
    const year = qs('#year');
    if (year) year.textContent = String(new Date().getFullYear());
  };

  const setupHeaderElevate = () => {
    const header = qs('[data-elevate]');
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle('is-elevated', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  };

  const setupMobileNav = () => {
    const toggle = qs('.nav-toggle');
    const menu = qs('.nav-menu');
    if (!toggle || !menu) return;

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      setOpen(!open);
    });

    // Close on click
    qsa('a[href^="#"]', menu).forEach((a) =>
      a.addEventListener('click', () => setOpen(false)),
    );

    // Close on escape / outside click
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (toggle.getAttribute('aria-expanded') === 'true') setOpen(false);
    });
    document.addEventListener(
      'click',
      (e) => {
        const open = toggle.getAttribute('aria-expanded') === 'true';
        if (!open) return;
        const t = e.target;
        if (!(t instanceof Node)) return;
        if (menu.contains(t) || toggle.contains(t)) return;
        setOpen(false);
      },
      { capture: true },
    );
  };

  const setupReveal = () => {
    const items = qsa('[data-reveal]');
    if (!items.length) return;
    if (prefersReducedMotion) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' },
    );

    items.forEach((el) => io.observe(el));
  };

  const setupSmoothScrollOffset = () => {
    // Only intercept same-page hash links. Keep native behavior for reduced motion.
    if (prefersReducedMotion) return;

    qsa('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href') || '';
        if (!href || href === '#') return;
        const target = qs(href);
        if (!target) return;
        e.preventDefault();

        const header = qs('.header');
        const headerH = header?.offsetHeight ?? 0;
        const y = target.getBoundingClientRect().top + window.scrollY - headerH - 10;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
        history.pushState(null, '', href);
      });
    });
  };

  const setupScrollSpy = () => {
    const links = qsa('.nav-menu a[href^="#"]');
    const ids = links
      .map((a) => a.getAttribute('href')?.slice(1))
      .filter(Boolean);
    const sections = ids
      .map((id) => qs(`#${CSS.escape(id)}`))
      .filter(Boolean);
    if (!sections.length) return;

    const setCurrent = (id) => {
      links.forEach((a) => {
        const href = a.getAttribute('href') || '';
        a.toggleAttribute('aria-current', href === `#${id}`);
      });
    };

    const header = qs('.header');
    const headerH = header?.offsetHeight ?? 72;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
        if (!visible) return;
        setCurrent(visible.target.id);
      },
      { threshold: [0.2, 0.35, 0.5], rootMargin: `-${headerH}px 0px -55% 0px` },
    );
    sections.forEach((s) => io.observe(s));
  };

  const renderFromContent = (data) => {
    // Title/description
    document.title = `${data?.name ?? 'Portfolio'} | ${data?.title ?? 'Portfolio'}`;
    const desc = qs('meta[name="description"]');
    if (desc) desc.setAttribute('content', `Portfolio of ${data?.name ?? 'Puneeth Raj Y'}`);

    // Simple text replacements
    qsa('[data-content]').forEach((el) => {
      const key = el.getAttribute('data-content');
      if (!key) return;
      setText(el, data?.[key] ?? el.textContent);
    });

    // Links
    qsa('[data-link]').forEach((el) => {
      const key = el.getAttribute('data-link');
      if (!key) return;
      const value = data?.[key];

      if (key === 'email') {
        const email = String(value ?? '').trim();
        if (!email) return;
        setHref(el, `mailto:${email}`);
        return;
      }

      if (key === 'phone') {
        const phone = String(value ?? '').trim();
        if (!phone) return;
        setHref(el, `tel:${phone.replaceAll(' ', '')}`);
        return;
      }

      setHref(el, value);
    });

    // Skills tags
    const technical = qs('#skills-technical');
    const soft = qs('#skills-soft');
    if (technical) {
      technical.innerHTML = '';
      (data?.skills?.technical ?? []).forEach((s) => technical.appendChild(createTag(s)));
    }
    if (soft) {
      soft.innerHTML = '';
      (data?.skills?.soft ?? []).forEach((s) => soft.appendChild(createTag(s)));
    }

    // Languages tags
    const langs = qs('#languages');
    if (langs) {
      langs.innerHTML = '';
      (data?.languages ?? []).forEach((l) => langs.appendChild(createTag(l)));
    }

    // Projects
    const projectsGrid = qs('#projects-grid');
    if (projectsGrid) {
      projectsGrid.innerHTML = '';
      (data?.projects ?? []).forEach((p) => {
        const card = document.createElement('article');
        card.className = 'card project';
        card.setAttribute('data-reveal', '');
        card.innerHTML = `
          <h3>${escapeHtml(p?.title ?? '')}</h3>
          <p>${escapeHtml(p?.description ?? '')}</p>
          <div class="tags" aria-label="Tech stack"></div>
        `;
        const tags = qs('.tags', card);
        (p?.techStack ?? []).forEach((t) => tags?.appendChild(createTag(t)));
        projectsGrid.appendChild(card);
      });
    }

    // Experience
    const exp = qs('#experience-list');
    if (exp) {
      exp.innerHTML = '';
      (data?.experience ?? []).forEach((x) => {
        const card = document.createElement('article');
        card.className = 'card';
        card.setAttribute('data-reveal', '');
        const metaBits = [x?.company, x?.location, x?.duration].filter(Boolean);
        card.innerHTML = `
          <h3 class="card-title">${escapeHtml(x?.title ?? '')}</h3>
          <div class="meta">${metaBits.map((m) => `<span>${escapeHtml(m)}</span>`).join('')}</div>
          <ul class="list"></ul>
          <div class="tags" aria-label="Tech stack"></div>
        `;
        const ul = qs('.list', card);
        (x?.highlights ?? []).forEach((h) => {
          const li = document.createElement('li');
          li.textContent = h;
          ul?.appendChild(li);
        });
        const tags = qs('.tags', card);
        (x?.techStack ?? []).forEach((t) => tags?.appendChild(createTag(t)));
        exp.appendChild(card);
      });
    }

    // Education
    const edu = qs('#education-grid');
    if (edu) {
      edu.innerHTML = '';
      (data?.education ?? []).forEach((e) => {
        const card = document.createElement('article');
        card.className = 'card';
        card.setAttribute('data-reveal', '');
        card.innerHTML = `
          <h3 class="card-title">${escapeHtml(e?.degree ?? '')}</h3>
          <div class="meta">
            <span>${escapeHtml(e?.institution ?? '')}</span>
            <span>${escapeHtml(e?.year ?? '')}</span>
          </div>
        `;
        edu.appendChild(card);
      });
    }

    // Certifications
    const certs = qs('#certifications-list');
    if (certs) {
      certs.innerHTML = '';
      (data?.certifications ?? []).forEach((c) => {
        const card = document.createElement('article');
        card.className = 'card';
        card.setAttribute('data-reveal', '');
        const extra = [c?.provider, c?.date, c?.details].filter(Boolean).join(' • ');
        card.innerHTML = `
          <h3 class="card-title">${escapeHtml(c?.title ?? '')}</h3>
          <div class="meta"><span>${escapeHtml(extra)}</span></div>
        `;
        certs.appendChild(card);
      });
    }

    // Activities
    const acts = qs('#activities-list');
    if (acts) {
      acts.innerHTML = '';
      (data?.activities ?? []).forEach((a) => {
        const card = document.createElement('article');
        card.className = 'card';
        card.setAttribute('data-reveal', '');
        const extra = [a?.event, a?.organizer, a?.role].filter(Boolean).join(' • ');
        card.innerHTML = `
          <h3 class="card-title">${escapeHtml(a?.title ?? '')}</h3>
          <div class="meta"><span>${escapeHtml(extra)}</span></div>
        `;
        acts.appendChild(card);
      });
    }
  };

  const loadEmbeddedContent = () => {
    const el = qs('#site-content');
    if (!el) return null;
    try {
      const txt = el.textContent?.trim();
      if (!txt) return null;
      return JSON.parse(txt);
    } catch {
      return null;
    }
  };

  const loadContent = async () => {
    // 1) Try fetch (works when served via http://)
    try {
      const res = await fetch('data/content.json', { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch {
      // ignore
    }

    // 2) Fallback to embedded JSON (works for file:// open)
    return loadEmbeddedContent();
  };

  const setupCanvasBackground = () => {
    const canvas = qs('#bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (prefersReducedMotion) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let w = 0;
    let h = 0;

    const resize = () => {
      w = Math.floor(window.innerWidth);
      h = Math.floor(window.innerHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const count = clamp(Math.floor((window.innerWidth * window.innerHeight) / 26000), 34, 90);
    const dots = Array.from({ length: count }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 1.0 + Math.random() * 1.8,
      vx: (-0.22 + Math.random() * 0.44),
      vy: (0.05 + Math.random() * 0.25),
      a: 0.12 + Math.random() * 0.22,
      hue: Math.random() > 0.55 ? 190 : 265,
    }));

    let mx = 0;
    let my = 0;
    window.addEventListener(
      'pointermove',
      (e) => {
        mx = (e.clientX / window.innerWidth - 0.5) * 2;
        my = (e.clientY / window.innerHeight - 0.5) * 2;
      },
      { passive: true },
    );

    let raf = 0;
    const step = () => {
      ctx.clearRect(0, 0, w, h);

      // soft gradient wash
      const g = ctx.createRadialGradient(w * 0.2, h * 0.15, 60, w * 0.2, h * 0.15, Math.max(w, h) * 0.9);
      g.addColorStop(0, 'rgba(124,58,237,0.10)');
      g.addColorStop(0.55, 'rgba(34,211,238,0.05)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // dots + connections
      for (const d of dots) {
        d.x += d.vx + mx * 0.25;
        d.y += d.vy + my * 0.18;
        if (d.x < -40) d.x = w + 40;
        if (d.x > w + 40) d.x = -40;
        if (d.y > h + 60) d.y = -60;

        ctx.beginPath();
        ctx.fillStyle = `hsla(${d.hue}, 92%, 70%, ${d.a})`;
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i];
          const b = dots[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 140) continue;
          const alpha = (1 - dist / 140) * 0.12;
          ctx.strokeStyle = `rgba(200, 220, 255, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      raf = window.requestAnimationFrame(step);
    };

    resize();
    step();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        window.cancelAnimationFrame(raf);
        return;
      }
      step();
    });
  };

  const init = async () => {
    setupYear();
    setupHeaderElevate();
    setupMobileNav();
    setupSmoothScrollOffset();
    setupScrollSpy();
    setupCanvasBackground();

    const data = await loadContent();
    if (data) renderFromContent(data);
    setupReveal();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();