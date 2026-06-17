'use strict';

const SLIDER_CONFIG = {
  autoplayDelay:    5000,   // мс между автопереключениями
  transitionMs:     700,    // мс CSS-перехода wrapper (должно совпадать с CSS)
  swipeThreshold:   50,     // px минимальный свайп для переключения
  pauseOnHover:     true,
};

class HeroSlider {
  /**
   * @param {string} rootSelector
   * @param {object} config
   */
  constructor(rootSelector, config = {}) {
    this.cfg = { ...SLIDER_CONFIG, ...config };

    // DOM-элементы
    this.root     = document.querySelector(rootSelector);
    if (!this.root) return;

    this.wrapper  = this.root.querySelector('.slider__wrapper');
    this.slides   = [...this.root.querySelectorAll('.slider__slide')];
    this.dots     = [...this.root.querySelectorAll('.slider__dot')];
    this.btnPrev  = this.root.querySelector('.slider__btn_prev');
    this.btnNext  = this.root.querySelector('.slider__btn_next');
    this.progress = this.root.querySelector('.slider__progress');

    // Состояние
    this.total      = this.slides.length;
    this.current    = 0;
    this.isPlaying  = false;
    this.isPaused   = false;
    this.timer      = null;
    this.isAnimating = false; 

    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchTracking = false;

    if (this.total < 2) {
      this.btnPrev?.remove();
      this.btnNext?.remove();
      this.root.querySelector('.slider__dots')?.remove();
      this.progress?.remove();
      return;
    }

    this._init();
  }


  _init() {
    this._setSlide(0, false); // начальная позиция без анимации
    this._bindControls();
    this._bindTouch();
    this._bindKeyboard();
    this._bindVisibility();
    this._bindResize();

    if (this.cfg.pauseOnHover) this._bindHover();

    this._startAutoplay();
  }

  /**
   * @param {number} index 
   * @param {boolean} [animate=true] 
   */
  _setSlide(index, animate = true) {
    if (index === this.current && animate) return;
    if (this.isAnimating) return;

    const prev = this.current;
    this.current = this._clamp(index);

    this.isAnimating = true;

    if (!animate) {
      this.wrapper.style.transition = 'none';
    } else {
      this.wrapper.style.transition = `transform ${this.cfg.transitionMs}ms cubic-bezier(0.22, 0.61, 0.36, 1)`;
    }

    this.wrapper.style.transform = `translateX(-${this.current * 100}%)`;

    this.slides[prev]?.classList.remove('slider__slide_active');
    this.slides[this.current]?.classList.add('slider__slide_active');

    this.dots[prev]?.classList.remove('slider__dot_active');
    this.dots[prev]?.setAttribute('aria-selected', 'false');
    this.dots[this.current]?.classList.add('slider__dot_active');
    this.dots[this.current]?.setAttribute('aria-selected', 'true');

    this.slides.forEach((slide, i) => {
      slide.setAttribute('aria-hidden', i !== this.current ? 'true' : 'false');
    });

    if (animate) {
      setTimeout(() => {
        this.isAnimating = false;
      }, this.cfg.transitionMs + 50);
    } else {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.wrapper.style.transition = '';
          this.isAnimating = false;
        });
      });
    }

    if (animate) this._resetProgress();
  }

  /** Следующий слайд (с зацикливанием) */
  next() {
    this._setSlide((this.current + 1) % this.total);
  }

  /** Предыдущий слайд (с зацикливанием) */
  prev() {
    this._setSlide((this.current - 1 + this.total) % this.total);
  }

  /** Ограничить индекс диапазоном [0, total-1] */
  _clamp(i) {
    return Math.max(0, Math.min(this.total - 1, i));
  }

  _resetProgress() {
    if (!this.progress) return;

    // Мгновенный сброс
    this.progress.classList.remove('slider__progress_animating');
    this.progress.style.width = '0%';

    if (!this.isPaused) {
      // Запускаем анимацию на следующем кадре
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.progress.classList.add('slider__progress_animating');
          this.progress.style.transition = `width ${this.cfg.autoplayDelay}ms linear`;
          this.progress.style.width = '100%';
        });
      });
    }
  }

  _pauseProgress() {
    if (!this.progress) return;
    const computed = window.getComputedStyle(this.progress).width;
    this.progress.style.transition = 'none';
    this.progress.style.width = computed;
    this.progress.classList.remove('slider__progress_animating');
  }

  _resumeProgress() {
    if (!this.progress) return;
    // Вычислим оставшееся время относительно текущей ширины
    const currentPct = parseFloat(this.progress.style.width) || 0;
    const remaining  = this.cfg.autoplayDelay * ((100 - currentPct) / 100);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.progress.classList.add('slider__progress_animating');
        this.progress.style.transition = `width ${remaining}ms linear`;
        this.progress.style.width = '100%';
      });
    });
  }

  _startAutoplay() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this._resetProgress();
    this._scheduleNext();
  }

  _scheduleNext() {
    clearTimeout(this.timer);
    if (!this.isPaused) {
      this.timer = setTimeout(() => {
        this.next();
        this._scheduleNext();
      }, this.cfg.autoplayDelay);
    }
  }

  _pause() {
    if (this.isPaused) return;
    this.isPaused = true;
    clearTimeout(this.timer);
    this._pauseProgress();
  }

  _resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this._resumeProgress();
    this._scheduleNext();
  }

 
  /** Стрелки и точки */
  _bindControls() {
    this.btnPrev?.addEventListener('click', () => {
      this.prev();
      if (!this.isPaused) {
        clearTimeout(this.timer);
        this._scheduleNext();
      }
    });

    this.btnNext?.addEventListener('click', () => {
      this.next();
      if (!this.isPaused) {
        clearTimeout(this.timer);
        this._scheduleNext();
      }
    });

    this.dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        this._setSlide(i);
        if (!this.isPaused) {
          clearTimeout(this.timer);
          this._scheduleNext();
        }
      });
    });
  }

  _bindHover() {
    this.root.addEventListener('mouseenter', () => this._pause());
    this.root.addEventListener('mouseleave', () => this._resume());
    // Фокус внутри слайдера (кнопки) — тоже пауза
    this.root.addEventListener('focusin',  () => this._pause());
    this.root.addEventListener('focusout', () => this._resume());
  }

  _bindTouch() {
    this.root.addEventListener('touchstart', e => {
      this._touchStartX    = e.touches[0].clientX;
      this._touchStartY    = e.touches[0].clientY;
      this._touchTracking  = true;
      this._pause();
    }, { passive: true });

    this.root.addEventListener('touchmove', e => {
      if (!this._touchTracking) return;
      const dx = Math.abs(e.touches[0].clientX - this._touchStartX);
      const dy = Math.abs(e.touches[0].clientY - this._touchStartY);
      if (dy > dx && dy > 10) this._touchTracking = false;
    }, { passive: true });

    this.root.addEventListener('touchend', e => {
      if (!this._touchTracking) {
        this._resume();
        return;
      }
      const deltaX = e.changedTouches[0].clientX - this._touchStartX;

      if (Math.abs(deltaX) >= this.cfg.swipeThreshold) {
        deltaX < 0 ? this.next() : this.prev();
        clearTimeout(this.timer);
        this._scheduleNext();
      }

      this._touchTracking = false;
      this._resume();
    }, { passive: true });
  }

  _bindKeyboard() {
    this.root.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.prev();
        clearTimeout(this.timer);
        this._scheduleNext();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.next();
        clearTimeout(this.timer);
        this._scheduleNext();
      }
    });
  }

  _bindVisibility() {
    document.addEventListener('visibilitychange', () => {
      document.hidden ? this._pause() : this._resume();
    });
  }

  _bindResize() {
    if (!('ResizeObserver' in window)) {
      window.addEventListener('resize', this._onResize.bind(this), { passive: true });
      return;
    }

    this._ro = new ResizeObserver(() => this._onResize());
    this._ro.observe(this.root);
  }

  _onResize() {
    this.wrapper.style.transition = 'none';
    this.wrapper.style.transform  = `translateX(-${this.current * 100}%)`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.wrapper.style.transition = '';
      });
    });
  }

  destroy() {
    clearTimeout(this.timer);
    this._ro?.disconnect();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.heroSlider = new HeroSlider('#hero-slider', {
    autoplayDelay: 5000,
    transitionMs:  700,
    swipeThreshold: 50,
    pauseOnHover:  true,
  });
});