/**
 * about.js — Нержавейка Майкоп
 * Интерактивность страницы «О компании»
 *
 * Функционал:
 *  - Анимация появления элементов при скролле (IntersectionObserver)
 *  - Анимация счётчиков KPI (число «отсчитывается» при появлении в viewport)
 *  - Анимация шагов workflow (последовательная)
 *  - Заглушка лайтбокса для сертификатов (раскрытие по клику/Enter)
 *
 * ES6+, нативный JS, без зависимостей
 */

'use strict';

/* =========================================================
   УТИЛИТЫ
   ========================================================= */

/** Безопасный querySelector */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* =========================================================
   INTERSECTION OBSERVER — FADE-IN ПРИ СКРОЛЛЕ
   ========================================================= */

const initScrollReveal = () => {
  // Добавляем стили анимации в head (чтобы не требовать отдельный CSS)
  const style = document.createElement('style');
  style.textContent = `
    .reveal {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity 0.6s cubic-bezier(0.22, 0.61, 0.36, 1),
                  transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
    }
    .reveal_visible {
      opacity: 1;
      transform: translateY(0);
    }
    .reveal_delay-1 { transition-delay: 0.1s; }
    .reveal_delay-2 { transition-delay: 0.2s; }
    .reveal_delay-3 { transition-delay: 0.3s; }
    .reveal_delay-4 { transition-delay: 0.4s; }
    .reveal_delay-5 { transition-delay: 0.5s; }

    .timeline__item { opacity: 0; transform: translateY(20px);
      transition: opacity 0.5s 0.1s cubic-bezier(0.22, 0.61, 0.36, 1),
                  transform 0.5s 0.1s cubic-bezier(0.22, 0.61, 0.36, 1); }
    .timeline__item_visible { opacity: 1; transform: translateY(0); }

    .cert-card { opacity: 0; transform: translateY(16px) scale(0.97);
      transition: opacity 0.45s cubic-bezier(0.22, 0.61, 0.36, 1),
                  transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1),
                  border-color 0.25s, box-shadow 0.25s; }
    .cert-card_visible { opacity: 1; transform: translateY(0) scale(1); }

    .kpi-item { opacity: 0; transform: translateY(16px);
      transition: opacity 0.5s cubic-bezier(0.22, 0.61, 0.36, 1),
                  transform 0.5s cubic-bezier(0.22, 0.61, 0.36, 1),
                  border-color 0.25s, background 0.25s; }
    .kpi-item_visible { opacity: 1; transform: translateY(0); }

    .partner-logo { opacity: 0; transform: scale(0.92);
      transition: opacity 0.4s, transform 0.4s,
                  border-color 0.25s, color 0.25s, background 0.25s; }
    .partner-logo_visible { opacity: 1; transform: scale(1); }
  `;
  document.head.appendChild(style);

  // Общий Observer для простых reveal-элементов
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal_visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -48px 0px' });

  qsa('.reveal').forEach(el => revealObserver.observe(el));

  // Timeline items — появляются поочерёдно
  const timelineObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('timeline__item_visible');
        timelineObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -32px 0px' });

  qsa('.timeline__item').forEach((item, i) => {
    item.style.transitionDelay = `${i * 0.08}s`;
    timelineObserver.observe(item);
  });

  // Cert cards
  const certObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('cert-card_visible');
        certObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  qsa('.cert-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.1}s`;
    certObserver.observe(card);
  });

  // KPI items
  const kpiObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('kpi-item_visible');
        kpiObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  qsa('.kpi-item').forEach((item, i) => {
    item.style.transitionDelay = `${i * 0.1}s`;
    kpiObserver.observe(item);
  });

  // Partner logos
  const partnerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('partner-logo_visible');
        partnerObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  qsa('.partner-logo').forEach((logo, i) => {
    logo.style.transitionDelay = `${i * 0.07}s`;
    partnerObserver.observe(logo);
  });
};

/* =========================================================
   АНИМАЦИЯ СЧЁТЧИКОВ KPI
   ========================================================= */

/**
 * Анимирует числовое значение от 0 до target за duration мс
 * @param {HTMLElement} el — элемент с текстом вида "1 200+" или "2010"
 * @param {number} duration — мс
 */
const animateCounter = (el, duration = 1400) => {
  const rawText  = el.textContent.trim();
  // Извлекаем число: убираем пробелы, знаки, буквы
  const numMatch = rawText.match(/[\d]+[\s\d]*/);
  if (!numMatch) return;

  const numStr   = numMatch[0].replace(/\s/g, '');
  const target   = parseInt(numStr, 10);
  if (isNaN(target)) return;

  // Суффикс (всё, что после числа)
  const suffix   = rawText.slice(numMatch.index + numMatch[0].length);
  // Префикс (всё, что до числа)
  const prefix   = rawText.slice(0, numMatch.index);

  const startTime = performance.now();

  const tick = (now) => {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutExpo
    const eased    = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current  = Math.round(target * eased);

    // Форматируем: числа >= 1000 разделяем пробелом (для читаемости)
    const formatted = current >= 1000
      ? current.toLocaleString('ru-RU').replace(/,/g, ' ')
      : String(current);

    el.textContent = `${prefix}${formatted}${suffix}`;

    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
};

const initCounters = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const valueEl = entry.target.querySelector('.kpi-item__value');
      if (valueEl && !valueEl.dataset.animated) {
        valueEl.dataset.animated = 'true';
        animateCounter(valueEl);
      }

      observer.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  qsa('.kpi-item').forEach(item => observer.observe(item));
};

/* =========================================================
   WORKFLOW — АНИМАЦИЯ ШАГОВ
   ========================================================= */

const initWorkflowSteps = () => {
  const steps = qsa('.workflow__step');
  if (!steps.length) return;

  // Добавляем начальные стили
  const style = document.createElement('style');
  style.textContent = `
    .workflow__step {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.5s cubic-bezier(0.22, 0.61, 0.36, 1),
                  transform 0.5s cubic-bezier(0.22, 0.61, 0.36, 1);
    }
    .workflow__step_visible {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('workflow__step_visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -32px 0px' });

  steps.forEach((step, i) => {
    step.style.transitionDelay = `${i * 0.12}s`;
    observer.observe(step);
  });
};

/* =========================================================
   СЕРТИФИКАТЫ — ЛАЙТБОКС (заглушка)
   ========================================================= */

const initCertLightbox = () => {
  // Создаём оверлей лайтбокса
  const overlay = document.createElement('div');
  overlay.id = 'cert-lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Просмотр сертификата');
  overlay.setAttribute('aria-hidden', 'true');

  overlay.innerHTML = `
    <div class="cert-lightbox__backdrop"></div>
    <div class="cert-lightbox__box">
      <button class="cert-lightbox__close" aria-label="Закрыть" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div class="cert-lightbox__content">
        <p class="cert-lightbox__title" id="lightbox-title"></p>
        <p class="cert-lightbox__note">
          Для загрузки полного PDF-документа свяжитесь с нами по e-mail
          <a href="mailto:info@nerzh-maykop.ru">info@nerzh-maykop.ru</a>
        </p>
      </div>
    </div>
  `;

  // Стили лайтбокса
  const style = document.createElement('style');
  style.textContent = `
    #cert-lightbox {
      position: fixed; inset: 0; z-index: 2000;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; pointer-events: none;
      transition: opacity 0.25s;
    }
    #cert-lightbox.cert-lightbox_open {
      opacity: 1; pointer-events: all;
    }
    .cert-lightbox__backdrop {
      position: absolute; inset: 0;
      background: rgba(13,17,23,0.9);
      backdrop-filter: blur(8px);
    }
    .cert-lightbox__box {
      position: relative; z-index: 1;
      background: var(--clr-bg-card);
      border: 1px solid var(--clr-border-hover);
      border-radius: var(--radius-lg);
      padding: 40px;
      max-width: 440px;
      width: calc(100% - 32px);
      text-align: center;
      box-shadow: var(--shadow-card);
    }
    .cert-lightbox__close {
      position: absolute; top: 16px; right: 16px;
      background: none; border: 1px solid var(--clr-border);
      border-radius: var(--radius-sm);
      color: var(--clr-text-muted);
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: color 0.25s, border-color 0.25s;
    }
    .cert-lightbox__close:hover { color: var(--clr-text-primary); border-color: var(--clr-border-hover); }
    .cert-lightbox__title {
      font-family: var(--font-display);
      font-size: 1.1rem; font-weight: 600;
      letter-spacing: 0.06em; text-transform: uppercase;
      color: var(--clr-text-primary); margin-bottom: 16px;
    }
    .cert-lightbox__note {
      font-size: 0.875rem; color: var(--clr-text-muted); line-height: 1.65;
    }
    .cert-lightbox__note a { color: var(--clr-accent); }
  `;
  document.head.appendChild(style);
  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector('.cert-lightbox__close');
  const backdrop = overlay.querySelector('.cert-lightbox__backdrop');
  const titleEl  = overlay.querySelector('#lightbox-title');

  let lastFocused = null;

  const openLightbox = (name) => {
    lastFocused = document.activeElement;
    if (titleEl) titleEl.textContent = name;
    overlay.classList.add('cert-lightbox_open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn?.focus();
  };

  const closeLightbox = () => {
    overlay.classList.remove('cert-lightbox_open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lastFocused?.focus();
  };

  // Открытие по клику на карточку
  qsa('.cert-card').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.querySelector('.cert-card__name')?.textContent ?? 'Сертификат';
      openLightbox(name);
    });

    // Keyboard: Enter / Space
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const name = card.querySelector('.cert-card__name')?.textContent ?? 'Сертификат';
        openLightbox(name);
      }
    });
  });

  closeBtn?.addEventListener('click', closeLightbox);
  backdrop?.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('cert-lightbox_open')) {
      closeLightbox();
    }
  });
};

/* =========================================================
   ИНИЦИАЛИЗАЦИЯ
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  // Проверяем поддержку IntersectionObserver
  if ('IntersectionObserver' in window) {
    initScrollReveal();
    initCounters();
    initWorkflowSteps();
  } else {
    // Fallback: показываем всё сразу
    qsa('.timeline__item, .cert-card, .kpi-item, .workflow__step, .partner-logo')
      .forEach(el => el.style.opacity = '1');
  }

  initCertLightbox();
});
