// js/ui/components/modal-manager.js
export class ModalManager {
    constructor() {
        this.modals = new Map();
        this.activeModal = null;
        this.backdrop = null;
    }

    registerModal(modalId, config = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`⚠️ Модальное окно не найдено: ${modalId}`);
            return;
        }

        const modalConfig = {
            element: modal,
            isOpen: false,
            closers: config.closers || [],
            onOpen: config.onOpen || null,
            onClose: config.onClose || null,
            closeOnBackdrop: config.closeOnBackdrop !== false,
            closeOnEscape: config.closeOnEscape !== false
        };

        this.modals.set(modalId, modalConfig);
        this.setupModalEvents(modalId, modalConfig);
    }

    setupModalEvents(modalId, config) {
        const { element, closers, closeOnBackdrop, closeOnEscape } = config;

        // Обработчики закрытия
        closers.forEach(closerId => {
            const closer = document.getElementById(closerId);
            if (closer) {
                closer.addEventListener('click', () => this.close(modalId));
            }
        });

        // Закрытие по клику на backdrop
        if (closeOnBackdrop) {
            element.addEventListener('click', (e) => {
                if (e.target === element) {
                    this.close(modalId);
                }
            });
        }

        // Закрытие по ESC
        if (closeOnEscape) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.activeModal === modalId) {
                    this.close(modalId);
                }
            });
        }
    }

    open(modalId) {
        if (this.activeModal === modalId) return;

        // Закрываем предыдущее модальное окно
        if (this.activeModal) {
            this.close(this.activeModal);
        }

        const modal = this.modals.get(modalId);
        if (!modal) {
            console.warn(`⚠️ Модальное окно не зарегистрировано: ${modalId}`);
            return;
        }

        // Показываем backdrop
        this.showBackdrop();

        // Показываем модальное окно
        modal.element.classList.remove('hidden');
        modal.isOpen = true;
        this.activeModal = modalId;

        // Вызываем callback
        if (modal.onOpen) {
            modal.onOpen();
        }

        // Фокусируемся на первом интерактивном элементе
        this.focusFirstInteractive(modal.element);

        // Блокируем прокрутку
        document.body.style.overflow = 'hidden';

        console.log(`📂 Открыто модальное окно: ${modalId}`);
    }

    close(modalId) {
        const modal = this.modals.get(modalId);
        if (!modal || !modal.isOpen) return;

        // Скрываем модальное окно
        modal.element.classList.add('hidden');
        modal.isOpen = false;
        this.activeModal = null;

        // Скрываем backdrop если нет других модальных окон
        this.hideBackdropIfNeeded();

        // Вызываем callback
        if (modal.onClose) {
            modal.onClose();
        }

        // Восстанавливаем прокрутку
        document.body.style.overflow = '';

        console.log(`📂 Закрыто модальное окно: ${modalId}`);
    }

    showBackdrop() {
        if (!this.backdrop) {
            this.backdrop = document.createElement('div');
            this.backdrop.className = 'modal-backdrop';
            this.backdrop.setAttribute('aria-hidden', 'true');
            document.body.appendChild(this.backdrop);
        }
        this.backdrop.classList.add('active');
    }

    hideBackdropIfNeeded() {
        if (this.backdrop && !this.activeModal) {
            this.backdrop.classList.remove('active');
        }
    }

    focusFirstInteractive(container) {
        const focusable = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusable.length > 0) {
            focusable[0].focus();
        }
    }

    getActiveModal() {
        return this.activeModal;
    }

    isOpen(modalId) {
        const modal = this.modals.get(modalId);
        return modal ? modal.isOpen : false;
    }

    destroy() {
        // Закрываем все модальные окна
        this.modals.forEach((modal, modalId) => {
            if (modal.isOpen) {
                this.close(modalId);
            }
        });

        // Удаляем backdrop
        if (this.backdrop) {
            this.backdrop.remove();
            this.backdrop = null;
        }

        this.modals.clear();
        this.activeModal = null;
    }
}