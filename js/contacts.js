/**
 * contacts.js — Нержавейка Майкоп
 * Интерактивность страницы «Контакты»
 *
 * Функционал:
 *  - Scroll-reveal для карточек сотрудников (IntersectionObserver)
 *  - Подсветка текущего рабочего дня/статуса (открыто / закрыто)
 *  - Плавный переход к форме при клике на якорные ссылки #form
 *  - Подсветка активной карточки при звонке (pulse-эффект на телефоне)
 *
 * ES6+, нативный JS, без зависимостей
 */

'use strict';

/* =========================================================
   УТИЛИТЫ
   ========================================================= */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* =========================================================
   SCROLL REVEAL — КАРТОЧКИ СОТРУДНИКОВ
   ========================================================= */

const initStaffReveal = () => {
  if (!('IntersectionObserver' in window)) return;

  const style = document.createElement('style');
  style.textContent = `
    .staff-card {
      opacity: 0;
      transform: translateY(28px);
      transition:
        opacity    0.55s cubic-bezier(0.22, 0.61, 0.36, 1),
        transform  0.55s cubic-bezier(0.22, 0.61, 0.36, 1),
        border-color 0.25s,
        box-shadow   0.25s;
    }
    .staff-card_visible {
      opacity: 1;
      transform: translateY(0);
    }

    .contacts-info__item {
      opacity: 0;
      transform: translateX(-12px);
      transition:
        opacity   0.45s cubic-bezier(0.22, 0.61, 0.36, 1),
        transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1);
    }
    .contacts-info__item_visible {
      opacity: 1;
      transform: translateX(0);
    }

    .contacts-map {
      opacity: 0;
      transform: scale(0.97);
      transition:
        opacity   0.6s 0.1s cubic-bezier(0.22, 0.61, 0.36, 1),
        transform 0.6s 0.1s cubic-bezier(0.22, 0.61, 0.36, 1),
        border-color 0.25s;
    }
    .contacts-map_visible {
      opacity: 1;
      transform: scale(1);
    }

    /* Пульсация на номере телефона директора при загрузке */
    @keyframes phoneGlow {
      0%   { text-shadow: none; }
      50%  { text-shadow: 0 0 16px rgba(79,195,247,0.5); }
      100% { text-shadow: none; }
    }
    .staff-card__phone_pulse {
      animation: phoneGlow 1.8s ease-in-out 3;
    }

    /* Бейдж «Сейчас открыто / закрыто» */
    .work-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 2px;
      margin-bottom: 16px;
    }
    .work-status__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .work-status_open {
      background: rgba(67, 197, 158, 0.12);
      color: #43c59e;
      border: 1px solid rgba(67, 197, 158, 0.3);
    }
    .work-status_open .work-status__dot {
      background: #43c59e;
      box-shadow: 0 0 6px rgba(67, 197, 158, 0.6);
      animation: pulse 2s infinite;
    }
    .work-status_closed {
      background: rgba(90, 114, 144, 0.12);
      color: var(--clr-text-muted);
      border: 1px solid var(--clr-border);
    }
    .work-status_closed .work-status__dot {
      background: var(--clr-text-muted);
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* Подсветка текущего дня в расписании */
    .contacts-form-info__hour_today {
      border-color: rgba(79,195,247,0.3) !important;
      background: rgba(79,195,247,0.06) !important;
    }
    .contacts-form-info__hour_today .contacts-form-info__hour-day {
      color: var(--clr-accent) !important;
    }
  `;
  document.head.appendChild(style);

  // Карточки сотрудников
  const staffObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('staff-card_visible');

      // После появления директорской карточки — пульсируем телефон
      if (entry.target.classList.contains('staff-card_director')) {
        const phone = entry.target.querySelector('.staff-card__phone');
        if (phone) {
          setTimeout(() => phone.classList.add('staff-card__phone_pulse'), 600);
        }
      }

      staffObserver.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -32px 0px' });

  qsa('.staff-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.12}s`;
    staffObserver.observe(card);
  });

  // Контактные строки
  const infoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('contacts-info__item_visible');
      infoObserver.unobserve(entry.target);
    });
  }, { threshold: 0.2 });

  qsa('.contacts-info__item').forEach((item, i) => {
    item.style.transitionDelay = `${i * 0.08}s`;
    infoObserver.observe(item);
  });

  // Карта
  const mapEl = qs('.contacts-map');
  if (mapEl) {
    const mapObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('contacts-map_visible');
          mapObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    mapObserver.observe(mapEl);
  }
};

/* =========================================================
   РАБОЧИЕ ЧАСЫ — статус и подсветка текущего дня
   ========================================================= */

const initWorkingHours = () => {
  // Рабочее время (Майкоп — UTC+3)
  const SCHEDULE = {
    // [dayOfWeek]: { open: HH, close: HH } или null (выходной)
    1: { open: 8,  close: 18 }, // Пн
    2: { open: 8,  close: 18 }, // Вт
    3: { open: 8,  close: 18 }, // Ср
    4: { open: 8,  close: 18 }, // Чт
    5: { open: 8,  close: 18 }, // Пт
    6: { open: 9,  close: 14 }, // Сб
    0: null,                     // Вс — выходной
  };

  const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

  // Текущее время Майкопа (UTC+3)
  const now       = new Date();
  const utc       = now.getTime() + now.getTimezoneOffset() * 60000;
  const local     = new Date(utc + 3 * 3600000); // UTC+3
  const day       = local.getDay();
  const hour      = local.getHours();
  const todayName = DAY_NAMES[day];

  const todaySchedule = SCHEDULE[day];
  const isOpen = todaySchedule
    ? (hour >= todaySchedule.open && hour < todaySchedule.close)
    : false;

  // Вставляем бейдж статуса в блок контактной инфо
  const infoBlock = qs('.contacts-info__block');
  if (infoBlock) {
    const badge = document.createElement('div');
    badge.className = `work-status ${isOpen ? 'work-status_open' : 'work-status_closed'}`;
    badge.setAttribute('aria-live', 'polite');
    badge.innerHTML = `
      <span class="work-status__dot" aria-hidden="true"></span>
      ${isOpen
        ? `Сейчас открыто · до ${todaySchedule.close}:00`
        : `Сейчас закрыто${todaySchedule ? ` · открываемся в ${todaySchedule.open}:00` : ' · выходной'}`
      }
    `;
    // Вставляем перед первым .contacts-info__item
    const firstItem = infoBlock.querySelector('.contacts-info__item');
    if (firstItem) infoBlock.insertBefore(badge, firstItem);
  }

  // Подсвечиваем текущий день в расписании
  const hourRows = qsa('.contacts-form-info__hour');
  hourRows.forEach(row => {
    const dayCell = row.querySelector('.contacts-form-info__hour-day');
    if (!dayCell) return;
    const text = dayCell.textContent.trim();
    // Проверяем, содержит ли строка название сегодняшнего дня
    if (text.includes(todayName) || (todayName === 'Суббота' && text === 'Суббота')) {
      row.classList.add('contacts-form-info__hour_today');
    }
    // Понедельник–Пятница — диапазон
    const weekdayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
    if (text.includes('Понедельник') && text.includes('Пятница')) {
      if (weekdayNames.includes(todayName)) {
        row.classList.add('contacts-form-info__hour_today');
      }
    }
  });
};

/* =========================================================
   ПЛАВНЫЙ СКРОЛЛ К ФОРМЕ (#form)
   ========================================================= */

const initAnchorScroll = () => {
  qsa('a[href="#form"]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = document.getElementById('form');
      if (!target) return;

      const headerH = qs('#site-header')?.offsetHeight ?? 72;
      const top = target.getBoundingClientRect().top + window.scrollY - headerH - 24;

      window.scrollTo({ top, behavior: 'smooth' });

      // Фокус внутрь формы для доступности
      setTimeout(() => {
        const firstInput = target.querySelector('input, textarea');
        firstInput?.focus({ preventScroll: true });
      }, 600);
    });
  });
};

/* =========================================================
   ИНИЦИАЛИЗАЦИЯ
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initStaffReveal();
  initWorkingHours();
  initAnchorScroll();
});