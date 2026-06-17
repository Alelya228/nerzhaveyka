'use strict';
/**
 * Безопасный querySelector — не бросает ошибку если элемент не найден
 * @param {string} selector
 * @param {Element} [ctx=document]
 * @returns {Element|null}
 */
const qs = (selector, ctx = document) => ctx.querySelector(selector);

/**
 * querySelectorAll → Array
 * @param {string} selector
 * @param {Element} [ctx=document]
 * @returns {Element[]}
 */
const qsa = (selector, ctx = document) => [...ctx.querySelectorAll(selector)];

/**
 * Добавить/удалить класс-модификатор (БЭМ)
 * @param {Element} el
 * @param {string} mod
 * @param {boolean} force
 */
const toggleMod = (el, mod, force) => el?.classList.toggle(mod, force);

const initBurger = () => {
  const burger    = qs('#burger-btn');
  const mobileNav = qs('#mobile-nav');

  if (!burger || !mobileNav) return;

  /** Состояние меню */
  let isOpen = false;

  /** Блокировка прокрутки body при открытом меню */
  const lockScroll  = () => { document.body.style.overflow = 'hidden'; };
  const unlockScroll = () => { document.body.style.overflow = ''; };

  const openMenu = () => {
    isOpen = true;
    toggleMod(burger,    'header__burger_open', true);
    toggleMod(mobileNav, 'mobile-nav_open',     true);
    burger.setAttribute('aria-expanded', 'true');
    mobileNav.setAttribute('aria-hidden', 'false');
    lockScroll();
  };

  const closeMenu = () => {
    isOpen = false;
    toggleMod(burger,    'header__burger_open', false);
    toggleMod(mobileNav, 'mobile-nav_open',     false);
    burger.setAttribute('aria-expanded', 'false');
    mobileNav.setAttribute('aria-hidden', 'true');
    unlockScroll();
  };

  const toggleMenu = () => (isOpen ? closeMenu() : openMenu());

  /* --- Обработчики --- */

  burger.addEventListener('click', toggleMenu);

  qsa('.mobile-nav__link', mobileNav).forEach(link => {
    link.addEventListener('click', closeMenu);
  });
  qs('.mobile-nav__phone', mobileNav)?.addEventListener('click', closeMenu);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) closeMenu();
  });

  const mql = window.matchMedia('(min-width: 769px)');
  mql.addEventListener('change', e => { if (e.matches && isOpen) closeMenu(); });
};

const initHeaderScroll = () => {
  const header = qs('#site-header');
  if (!header) return;

  const SCROLL_THRESHOLD = 60;

  const onScroll = () => {
    toggleMod(header, 'header_scrolled', window.scrollY > SCROLL_THRESHOLD);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
};

document.addEventListener('DOMContentLoaded', () => {
  initBurger();
  initHeaderScroll();
});