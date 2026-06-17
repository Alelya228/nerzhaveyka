/**
 * catalog.js — Нержавейка Майкоп
 * Интерактивный каталог: фильтрация, сортировка, вид, мобильный drawer
 *
 * Функционал:
 *  - Фильтрация карточек по data-атрибутам без перезагрузки страницы
 *  - Несколько одновременных фильтров (AND-логика между группами, OR внутри группы)
 *  - Активные теги выбранных фильтров с кнопкой удаления
 *  - Сортировка по имени и цене
 *  - Переключение вида: сетка / список
 *  - Аккордеон групп фильтров
 *  - Мобильный drawer: клонирование панели фильтров, синхронизация состояния
 *  - Счётчик найденных позиций
 *  - Кнопка «Сбросить всё»
 *
 * ES6+, нативный JS, без зависимостей
 */

'use strict';

/* =========================================================
   ДАННЫЕ ФИЛЬТРОВ (лейблы для тегов)
   ========================================================= */

const FILTER_LABELS = {
  category: {
    list:   'Листовой прокат',
    truba:  'Трубы',
    prutok: 'Прутки и проволока',
    fason:  'Фасонный прокат',
    rezkа:  'Резка и обработка',
  },
  grade: {
    '304': 'AISI 304',
    '316': 'AISI 316L',
    '430': 'AISI 430',
    '321': 'AISI 321',
  },
  stock: {
    instock: 'В наличии',
    order:   'Под заказ',
  },
};

/* =========================================================
   СОСТОЯНИЕ
   ========================================================= */

const state = {
  /** @type {Object.<string, Set<string>>} */
  filters: {
    category: new Set(),
    grade:    new Set(),
    stock:    new Set(),
  },
  sort:     'default',   // 'default' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'
  view:     'grid',      // 'grid' | 'list'
};

/* =========================================================
   DOM-ССЫЛКИ
   ========================================================= */

const dom = {
  grid:          () => document.getElementById('product-grid'),
  cards:         () => [...document.querySelectorAll('.product-card[data-category]')],
  noResults:     () => document.getElementById('no-results'),
  foundCount:    () => document.getElementById('found-count'),
  activeFilters: () => document.getElementById('active-filters'),
  filterBadge:   () => document.getElementById('filter-badge'),
  sortSelect:    () => document.getElementById('sort-select'),
  viewGrid:      () => document.getElementById('view-grid'),
  viewList:      () => document.getElementById('view-list'),
  checkboxes:    () => [...document.querySelectorAll('input[data-filter]')],
  resetBtns:     () => [...document.querySelectorAll('#filter-reset-btn, #no-results-reset')],
  // Drawer
  filterToggle:  () => document.getElementById('filter-toggle-btn'),
  filterOverlay: () => document.getElementById('filter-overlay'),
  filterDrawer:  () => document.getElementById('filter-drawer'),
  drawerClose:   () => document.getElementById('filter-drawer-close'),
  drawerApply:   () => document.getElementById('filter-drawer-apply'),
  drawerBody:    () => document.getElementById('filter-drawer-body'),
  filterPanel:   () => document.getElementById('filter-panel'),
};

/* =========================================================
   ФИЛЬТРАЦИЯ
   ========================================================= */

/**
 * Применить текущее состояние фильтров к карточкам
 * Логика: внутри группы — OR, между группами — AND
 */
const applyFilters = () => {
  const cards    = dom.cards();
  const noResults = dom.noResults();
  let visible = 0;

  cards.forEach(card => {
    const matches = Object.entries(state.filters).every(([group, values]) => {
      if (values.size === 0) return true; // группа не активна — пропускаем
      const cardVal = card.dataset[group] ?? '';
      return values.has(cardVal);
    });

    const isHidden = !matches;
    card.classList.toggle('product-card_hidden', isHidden);
    card.setAttribute('aria-hidden', isHidden ? 'true' : 'false');
    if (matches) visible++;
  });

  // Сортировка видимых карточек
  applySortToDOM();

  // Обновить счётчик
  const countEl = dom.foundCount();
  if (countEl) countEl.textContent = visible;

  // Пустой результат
  if (noResults) noResults.hidden = visible > 0;
};

/* =========================================================
   СОРТИРОВКА
   ========================================================= */

const applySortToDOM = () => {
  const grid  = dom.grid();
  if (!grid) return;

  const cards = dom.cards().filter(c => !c.classList.contains('product-card_hidden'));

  const sorted = [...cards].sort((a, b) => {
    switch (state.sort) {
      case 'name-asc':
        return (a.dataset.name ?? '').localeCompare(b.dataset.name ?? '', 'ru');
      case 'name-desc':
        return (b.dataset.name ?? '').localeCompare(a.dataset.name ?? '', 'ru');
      case 'price-asc':
        return Number(a.dataset.price ?? 0) - Number(b.dataset.price ?? 0);
      case 'price-desc':
        return Number(b.dataset.price ?? 0) - Number(a.dataset.price ?? 0);
      default:
        return 0;
    }
  });

  // Переставляем узлы в DOM в нужном порядке
  sorted.forEach(card => grid.appendChild(card));
};

/* =========================================================
   АКТИВНЫЕ ТЕГИ ФИЛЬТРОВ
   ========================================================= */

const renderActiveTags = () => {
  const container = dom.activeFilters();
  if (!container) return;

  // Считаем активные фильтры
  let totalActive = 0;
  const tags = [];

  Object.entries(state.filters).forEach(([group, values]) => {
    values.forEach(val => {
      totalActive++;
      const label = FILTER_LABELS[group]?.[val] ?? val;
      tags.push({ group, val, label });
    });
  });

  // Обновляем badge на мобильной кнопке
  const badge = dom.filterBadge();
  if (badge) {
    badge.textContent = totalActive;
    badge.classList.toggle('filter-toggle-btn__badge_hidden', totalActive === 0);
  }

  // Рендер тегов
  container.innerHTML = tags.map(({ group, val, label }) => `
    <span class="active-filter-tag" data-group="${group}" data-val="${val}">
      ${label}
      <button
        class="active-filter-tag__remove"
        aria-label="Удалить фильтр: ${label}"
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </span>
  `).join('');

  // Обработчики удаления тега
  container.querySelectorAll('.active-filter-tag__remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag   = btn.closest('.active-filter-tag');
      const group = tag.dataset.group;
      const val   = tag.dataset.val;

      state.filters[group].delete(val);
      syncCheckboxes();
      applyFilters();
      renderActiveTags();
    });
  });
};

/* =========================================================
   СИНХРОНИЗАЦИЯ ЧЕКБОКСОВ
   (нужна при удалении тега или сбросе)
   ========================================================= */

const syncCheckboxes = () => {
  dom.checkboxes().forEach(cb => {
    const group = cb.dataset.filter;
    const val   = cb.value;
    cb.checked = state.filters[group]?.has(val) ?? false;
  });
};

/* =========================================================
   СБРОС ВСЕХ ФИЛЬТРОВ
   ========================================================= */

const resetAllFilters = () => {
  Object.keys(state.filters).forEach(g => state.filters[g].clear());
  syncCheckboxes();
  applyFilters();
  renderActiveTags();
};

/* =========================================================
   АККОРДЕОН ГРУПП ФИЛЬТРОВ
   ========================================================= */

const initFilterAccordion = (root = document) => {
  root.querySelectorAll('.filter-group__toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const group    = btn.closest('.filter-group');
      const isOpen   = group.classList.contains('filter-group_open');
      const expanded = !isOpen;

      group.classList.toggle('filter-group_open', expanded);
      btn.setAttribute('aria-expanded', String(expanded));
    });
  });
};

/* =========================================================
   МОБИЛЬНЫЙ DRAWER
   ========================================================= */

let drawerOpen = false;

const openDrawer = () => {
  const overlay = dom.filterOverlay();
  const drawer  = dom.filterDrawer();
  const toggle  = dom.filterToggle();

  drawerOpen = true;
  overlay?.classList.add('filter-overlay_open');
  drawer?.classList.add('filter-drawer_open');
  overlay?.removeAttribute('aria-hidden');
  drawer?.setAttribute('aria-hidden', 'false');
  toggle?.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';

  // Фокус внутрь drawer
  setTimeout(() => dom.drawerClose()?.focus(), 50);
};

const closeDrawer = () => {
  const overlay = dom.filterOverlay();
  const drawer  = dom.filterDrawer();
  const toggle  = dom.filterToggle();

  drawerOpen = false;
  overlay?.classList.remove('filter-overlay_open');
  drawer?.classList.remove('filter-drawer_open');
  overlay?.setAttribute('aria-hidden', 'true');
  drawer?.setAttribute('aria-hidden', 'true');
  toggle?.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';

  // Возвращаем фокус на кнопку открытия
  toggle?.focus();
};

/**
 * Клонируем панель фильтров в drawer (mobile).
 * Чекбоксы в drawer ссылаются на то же состояние.
 */
const buildDrawerContent = () => {
  const drawerBody = dom.drawerBody();
  const panel      = dom.filterPanel();
  if (!drawerBody || !panel) return;

  // Клонируем содержимое панели (без заголовка с кнопкой сброса)
  const clone = panel.cloneNode(true);
  // Убираем заголовок (он уже в drawer__header)
  clone.querySelector('.filter-panel__header')?.remove();
  clone.removeAttribute('id'); // убираем дублирующий id

  // Переименовываем id у скрытых body групп, чтобы не было дублей
  clone.querySelectorAll('[id]').forEach(el => {
    el.id = `drawer-${el.id}`;
  });
  clone.querySelectorAll('[aria-controls]').forEach(el => {
    const ctrl = el.getAttribute('aria-controls');
    el.setAttribute('aria-controls', `drawer-${ctrl}`);
  });

  drawerBody.innerHTML = '';
  drawerBody.appendChild(clone);

  // Синхронизируем состояние чекбоксов
  clone.querySelectorAll('input[data-filter]').forEach(cb => {
    const group = cb.dataset.filter;
    const val   = cb.value;
    cb.checked  = state.filters[group]?.has(val) ?? false;

    // Чекбокс в drawer → обновляет общее состояние
    cb.addEventListener('change', () => {
      if (cb.checked) {
        state.filters[group]?.add(val);
      } else {
        state.filters[group]?.delete(val);
      }
      // Синхронизируем оригинальный сайдбар
      syncCheckboxes();
    });
  });

  // Аккордеон для клона
  initFilterAccordion(clone);
};

const initDrawer = () => {
  dom.filterToggle()?.addEventListener('click', () => {
    buildDrawerContent();
    openDrawer();
  });

  dom.drawerClose()?.addEventListener('click', closeDrawer);
  dom.filterOverlay()?.addEventListener('click', closeDrawer);

  // Apply: применяем + закрываем
  dom.drawerApply()?.addEventListener('click', () => {
    applyFilters();
    renderActiveTags();
    closeDrawer();
  });

  // Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawerOpen) closeDrawer();
  });
};

/* =========================================================
   VIEW TOGGLE (сетка / список)
   ========================================================= */

const initViewToggle = () => {
  const grid = dom.grid();
  const btnGrid = dom.viewGrid();
  const btnList = dom.viewList();
  if (!grid || !btnGrid || !btnList) return;

  const setView = (view) => {
    state.view = view;
    grid.classList.toggle('product-grid_list', view === 'list');

    btnGrid.classList.toggle('view-toggle__btn_active', view === 'grid');
    btnGrid.setAttribute('aria-pressed', String(view === 'grid'));

    btnList.classList.toggle('view-toggle__btn_active', view === 'list');
    btnList.setAttribute('aria-pressed', String(view === 'list'));
  };

  btnGrid.addEventListener('click', () => setView('grid'));
  btnList.addEventListener('click', () => setView('list'));
};

/* =========================================================
   ПРИВЯЗКА ОСНОВНЫХ СОБЫТИЙ
   ========================================================= */

const bindEvents = () => {

  /* --- Чекбоксы в сайдбаре --- */
  dom.checkboxes().forEach(cb => {
    cb.addEventListener('change', () => {
      const group = cb.dataset.filter;
      const val   = cb.value;

      if (cb.checked) {
        state.filters[group]?.add(val);
      } else {
        state.filters[group]?.delete(val);
      }

      applyFilters();
      renderActiveTags();
    });
  });

  /* --- Сортировка --- */
  dom.sortSelect()?.addEventListener('change', e => {
    state.sort = e.target.value;
    applyFilters();
  });

  /* --- Кнопки сброса --- */
  dom.resetBtns().forEach(btn => {
    btn.addEventListener('click', resetAllFilters);
  });
};

/* =========================================================
   ИНИЦИАЛИЗАЦИЯ
   ========================================================= */

const initCatalog = () => {
  bindEvents();
  initFilterAccordion();
  initViewToggle();
  initDrawer();

  // Первичный рендер (все карточки видны)
  applyFilters();
  renderActiveTags();
};

document.addEventListener('DOMContentLoaded', initCatalog);