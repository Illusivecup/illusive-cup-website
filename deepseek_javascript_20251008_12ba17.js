// js/ui/components/form-validator.js
export class FormValidator {
    constructor(formElement) {
        this.form = formElement;
        this.fields = new Map();
        this.errors = new Map();
        this.setupForm();
    }

    setupForm() {
        // Находим все поля с валидацией
        const fields = this.form.querySelectorAll('[data-validation]');
        
        fields.forEach(field => {
            const rules = field.dataset.validation.split('|');
            this.fields.set(field.name || field.id, {
                element: field,
                rules: rules,
                isValid: true
            });

            // Добавляем обработчики валидации
            this.addValidationListeners(field);
        });

        // Обработчик отправки формы
        this.form.addEventListener('submit', (e) => {
            if (!this.validateAll()) {
                e.preventDefault();
                this.showAllErrors();
            }
        });
    }

    addValidationListeners(field) {
        const events = ['blur', 'input'];
        
        events.forEach(event => {
            field.addEventListener(event, () => {
                this.validateField(field.name || field.id);
            });
        });
    }

    validateField(fieldName) {
        const field = this.fields.get(fieldName);
        if (!field) return true;

        const value = field.element.value.trim();
        let isValid = true;
        const errors = [];

        field.rules.forEach(rule => {
            const [ruleName, ruleParam] = rule.split(':');
            
            switch (ruleName) {
                case 'required':
                    if (!value) {
                        errors.push('Это поле обязательно для заполнения');
                        isValid = false;
                    }
                    break;
                    
                case 'min':
                    if (value.length < parseInt(ruleParam)) {
                        errors.push(`Минимальная длина: ${ruleParam} символов`);
                        isValid = false;
                    }
                    break;
                    
                case 'max':
                    if (value.length > parseInt(ruleParam)) {
                        errors.push(`Максимальная длина: ${ruleParam} символов`);
                        isValid = false;
                    }
                    break;
                    
                case 'email':
                    if (!this.isValidEmail(value)) {
                        errors.push('Введите корректный email адрес');
                        isValid = false;
                    }
                    break;
                    
                case 'number':
                    if (isNaN(value)) {
                        errors.push('Введите числовое значение');
                        isValid = false;
                    }
                    break;
                    
                case 'min_value':
                    if (parseFloat(value) < parseFloat(ruleParam)) {
                        errors.push(`Минимальное значение: ${ruleParam}`);
                        isValid = false;
                    }
                    break;
                    
                case 'max_value':
                    if (parseFloat(value) > parseFloat(ruleParam)) {
                        errors.push(`Максимальное значение: ${ruleParam}`);
                        isValid = false;
                    }
                    break;
            }
        });

        field.isValid = isValid;
        this.errors.set(fieldName, errors);
        this.updateFieldUI(field, isValid, errors);

        return isValid;
    }

    validateAll() {
        let allValid = true;
        
        this.fields.forEach((field, fieldName) => {
            const isValid = this.validateField(fieldName);
            if (!isValid) allValid = false;
        });

        return allValid;
    }

    updateFieldUI(field, isValid, errors) {
        // Удаляем предыдущие сообщения об ошибках
        this.removeFieldErrors(field.element);

        // Обновляем стили поля
        field.element.classList.toggle('error', !isValid);
        field.element.classList.toggle('success', isValid);

        // Показываем ошибки если есть
        if (!isValid && errors.length > 0) {
            this.showFieldErrors(field.element, errors);
        }
    }

    showFieldErrors(fieldElement, errors) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'field-errors';
        
        errors.forEach(error => {
            const errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            errorElement.textContent = error;
            errorContainer.appendChild(errorElement);
        });

        fieldElement.parentNode.appendChild(errorContainer);
    }

    removeFieldErrors(fieldElement) {
        const existingErrors = fieldElement.parentNode.querySelector('.field-errors');
        if (existingErrors) {
            existingErrors.remove();
        }
    }

    showAllErrors() {
        this.fields.forEach((field, fieldName) => {
            if (!field.isValid) {
                this.validateField(fieldName);
            }
        });
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    getErrors() {
        return Object.fromEntries(this.errors);
    }

    reset() {
        this.fields.forEach(field => {
            field.isValid = true;
            this.removeFieldErrors(field.element);
            field.element.classList.remove('error', 'success');
        });
        this.errors.clear();
    }

    destroy() {
        this.form.removeEventListener('submit', this.validateAll);
        this.fields.clear();
        this.errors.clear();
    }
}