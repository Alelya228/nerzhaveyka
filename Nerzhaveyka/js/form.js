/**
 * form.js — Нержавейка Майкоп
 * Валидация формы обратной связи + маска телефона
 *
 * Функционал:
 *  - Маска ввода телефона: +7 (___) ___-__-__
 *  - Валидация имени, телефона, email (опционально)
 *  - Визуальные ошибки через БЭМ-модификаторы
 *  - Эмуляция отправки (fetch-заглушка)
 *  - Показ success-сообщения после отправки
 *
 * ES6+, нативный JS, без зависимостей
 */

'use strict';

/* =========================================================
   МАСКА ТЕЛЕФОНА
   ========================================================= */

/**
 * Применяет маску +7 (XXX) XXX-XX-XX к полю ввода
 * @param {HTMLInputElement} input
 */
const applyPhoneMask = (input) => {
  if (!input) return;

  /** Оставляем только цифры */
  const digits = (val) => val.replace(/\D/g, '');

  /** Форматируем строку цифр в маску */
  const format = (raw) => {
    // Убираем ведущую 7 или 8
    let d = raw.replace(/^[78]/, '');
    let out = '+7';

    if (d.length === 0) return out;
    out += ' (';
    if (d.length <= 3) {
      out += d;
    } else {
      out += d.slice(0, 3) + ') ';
      if (d.length <= 6) {
        out += d.slice(3);
      } else {
        out += d.slice(3, 6) + '-';
        if (d.length <= 8) {
          out += d.slice(6);
        } else {
          out += d.slice(6, 8) + '-' + d.slice(8, 10);
        }
      }
    }

    return out;
  };

  const onInput = (e) => {
    const el      = e.target;
    const selEnd  = el.selectionEnd;
    const prevLen = el.value.length;

    // Сохраняем только цифры (без первой 7)
    let raw = digits(el.value).replace(/^7/, '');
    // Ограничиваем 10 цифрами (без кода страны)
    raw = raw.slice(0, 10);

    const formatted = format(raw);
    el.value = formatted;

    // Корректируем позицию курсора при вставке
    const diff = formatted.length - prevLen;
    const newPos = Math.max(0, selEnd + diff);
    el.setSelectionRange(newPos, newPos);
  };

  const onKeydown = (e) => {
    // Разрешаем: цифры, управляющие клавиши, +
    const allowed = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End',
    ];
    if (
      allowed.includes(e.key) ||
      (e.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase()))
    ) return;

    // Блокируем нецифровые символы
    if (!/\d/.test(e.key)) e.preventDefault();
  };

  const onFocus = (e) => {
    if (!e.target.value) e.target.value = '+7 (';
  };

  const onBlur = (e) => {
    if (e.target.value === '+7 (') e.target.value = '';
  };

  input.addEventListener('input',   onInput);
  input.addEventListener('keydown', onKeydown);
  input.addEventListener('focus',   onFocus);
  input.addEventListener('blur',    onBlur);
  input.addEventListener('paste', (e) => {
    // При вставке даём браузеру вставить, потом форматируем через input-событие
    setTimeout(() => {
      const ev = new Event('input', { bubbles: true });
      input.dispatchEvent(ev);
    }, 0);
  });
};

/* =========================================================
   ВАЛИДАЦИЯ
   ========================================================= */

const VALIDATORS = {
  name: (val) => val.trim().length >= 2,

  phone: (val) => {
    const d = val.replace(/\D/g, '');
    return d.length === 11;
  },

  email: (val) => {
    if (!val.trim()) return true; // email необязателен
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim());
  },
};

const ERROR_MESSAGES = {
  name:  'Пожалуйста, введите ваше имя (минимум 2 символа)',
  phone: 'Введите корректный номер телефона (+7 и 10 цифр)',
  email: 'Введите корректный e-mail адрес',
};

/**
 * Показать/скрыть ошибку поля
 * @param {HTMLInputElement} input
 * @param {boolean} isValid
 * @param {string} fieldName
 */
const setFieldState = (input, isValid, fieldName) => {
  const errorEl = document.getElementById(`error-${fieldName}`);

  if (isValid) {
    input.classList.remove('form-group__input_error');
    errorEl?.classList.remove('form-group__error_visible');
    if (errorEl) errorEl.textContent = '';
  } else {
    input.classList.add('form-group__input_error');
    if (errorEl) {
      errorEl.textContent = ERROR_MESSAGES[fieldName] || '';
      errorEl.classList.add('form-group__error_visible');
    }
  }

  return isValid;
};

/* =========================================================
   ФОРМА
   ========================================================= */

const initContactForm = () => {
  const form      = document.getElementById('contact-form');
  const successEl = document.getElementById('form-success');

  if (!form) return;

  // Поля
  const fieldName  = document.getElementById('field-name');
  const fieldPhone = document.getElementById('field-phone');
  const fieldEmail = document.getElementById('field-email');

  // Применяем маску телефона
  applyPhoneMask(fieldPhone);

  /* --- Валидация в реальном времени (после первой попытки отправки) --- */
  let touched = { name: false, phone: false, email: false };

  const validateAll = () => {
    const validName  = setFieldState(fieldName,  VALIDATORS.name(fieldName?.value  ?? ''), 'name');
    const validPhone = setFieldState(fieldPhone, VALIDATORS.phone(fieldPhone?.value ?? ''), 'phone');
    const validEmail = setFieldState(fieldEmail, VALIDATORS.email(fieldEmail?.value ?? ''), 'email');
    return validName && validPhone && validEmail;
  };

  // Live-валидация отдельных полей
  fieldName?.addEventListener('input', () => {
    if (touched.name) setFieldState(fieldName, VALIDATORS.name(fieldName.value), 'name');
  });
  fieldName?.addEventListener('blur',  () => {
    touched.name = true;
    setFieldState(fieldName, VALIDATORS.name(fieldName.value), 'name');
  });

  fieldPhone?.addEventListener('input', () => {
    if (touched.phone) setFieldState(fieldPhone, VALIDATORS.phone(fieldPhone.value), 'phone');
  });
  fieldPhone?.addEventListener('blur', () => {
    touched.phone = true;
    setFieldState(fieldPhone, VALIDATORS.phone(fieldPhone.value), 'phone');
  });

  fieldEmail?.addEventListener('input', () => {
    if (touched.email) setFieldState(fieldEmail, VALIDATORS.email(fieldEmail.value), 'email');
  });
  fieldEmail?.addEventListener('blur', () => {
    touched.email = true;
    setFieldState(fieldEmail, VALIDATORS.email(fieldEmail.value), 'email');
  });

  /* --- Submit --- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Помечаем все поля как "тронутые"
    touched = { name: true, phone: true, email: true };

    if (!validateAll()) {
      // Фокус на первое невалидное поле
      form.querySelector('.form-group__input_error')?.focus();
      return;
    }

    const submitBtn = form.querySelector('.contact-form__submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем...';

    try {
      // Собираем данные формы
      const data = {
        name:    fieldName?.value.trim()  ?? '',
        phone:   fieldPhone?.value.trim() ?? '',
        email:   fieldEmail?.value.trim() ?? '',
        message: document.getElementById('field-message')?.value.trim() ?? '',
      };

      /* ---
         Здесь должен быть реальный fetch на бэкенд.
         Пока — заглушка с задержкой 800мс для имитации запроса.
      --- */
      await fakeSubmit(data);

      // Успех — показываем success-блок
      form.style.display = 'none';
      successEl?.classList.add('contact-form__success_visible');

      // Скролл к форме на мобильных
      document.getElementById('contact-form-block')?.scrollIntoView({
        behavior: 'smooth', block: 'center',
      });

    } catch (err) {
      console.error('Form submit error:', err);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить заявку';
      // Показать общую ошибку — можно доработать
      alert('Произошла ошибка при отправке. Пожалуйста, позвоните нам по телефону.');
    }
  });
};

/**
 * Заглушка отправки (заменить на реальный fetch)
 * @param {object} data
 * @returns {Promise<void>}
 */
const fakeSubmit = (data) => {
  console.log('Form data (dev stub):', data);
  return new Promise((resolve) => setTimeout(resolve, 800));
};

/*
  Пример реального fetch (раскомментировать при наличии бэкенда):

  const realSubmit = async (data) => {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return response.json();
  };
*/

/* =========================================================
   ИНИЦИАЛИЗАЦИЯ
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initContactForm();
});