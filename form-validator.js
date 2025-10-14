/**
 * Form Validator
 * Provides comprehensive form validation with error handling and user feedback
 */

class FormValidator {
    constructor() {
        this.validationRules = new Map();
        this.errorMessages = new Map();
        this.validatedFields = new Set();
        
        this.init();
    }

    init() {
        // Set up default validation rules
        this.setupDefaultRules();
        
        // Set up default error messages
        this.setupDefaultMessages();
    }

    /**
     * Set up default validation rules
     */
    setupDefaultRules() {
        this.validationRules.set('pnr', {
            required: true,
            pattern: /^[0-9-]+$/,
            minLength: 9,
            maxLength: 12,
            custom: (value) => {
                const cleanPNR = value.replace(/-/g, '');
                return cleanPNR.length >= 9 && cleanPNR.length <= 10;
            }
        });

        this.validationRules.set('email', {
            required: false,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        });

        this.validationRules.set('phone', {
            required: false,
            pattern: /^[\+]?[1-9][\d]{0,15}$/
        });

        this.validationRules.set('text', {
            required: false,
            minLength: 1,
            maxLength: 255
        });
    }

    /**
     * Set up default error messages
     */
    setupDefaultMessages() {
        this.errorMessages.set('required', 'This field is required');
        this.errorMessages.set('pattern', 'Please enter a valid format');
        this.errorMessages.set('minLength', 'Input is too short');
        this.errorMessages.set('maxLength', 'Input is too long');
        this.errorMessages.set('custom', 'Invalid input');
        
        // PNR specific messages
        this.errorMessages.set('pnr.required', 'Please enter a PNR number');
        this.errorMessages.set('pnr.pattern', 'PNR should contain only numbers and dashes');
        this.errorMessages.set('pnr.minLength', 'PNR number must be at least 9 characters');
        this.errorMessages.set('pnr.custom', 'PNR number must be 9-10 digits');
        
        // Email specific messages
        this.errorMessages.set('email.pattern', 'Please enter a valid email address');
        
        // Phone specific messages
        this.errorMessages.set('phone.pattern', 'Please enter a valid phone number');
    }

    /**
     * Validate a single field
     * @param {HTMLElement} field - Input field to validate
     * @param {string} type - Validation type (pnr, email, phone, text)
     * @returns {Object} - Validation result
     */
    validateField(field, type = 'text') {
        const value = field.value.trim();
        const rules = this.validationRules.get(type) || this.validationRules.get('text');
        const result = {
            isValid: true,
            errors: [],
            field: field
        };

        // Required validation
        if (rules.required && !value) {
            result.isValid = false;
            result.errors.push(this.getErrorMessage('required', type));
        }

        // Skip other validations if field is empty and not required
        if (!value && !rules.required) {
            return result;
        }

        // Pattern validation
        if (rules.pattern && !rules.pattern.test(value)) {
            result.isValid = false;
            result.errors.push(this.getErrorMessage('pattern', type));
        }

        // Length validations
        if (rules.minLength && value.length < rules.minLength) {
            result.isValid = false;
            result.errors.push(this.getErrorMessage('minLength', type));
        }

        if (rules.maxLength && value.length > rules.maxLength) {
            result.isValid = false;
            result.errors.push(this.getErrorMessage('maxLength', type));
        }

        // Custom validation
        if (rules.custom && !rules.custom(value)) {
            result.isValid = false;
            result.errors.push(this.getErrorMessage('custom', type));
        }

        return result;
    }

    /**
     * Get appropriate error message
     * @param {string} errorType - Type of error
     * @param {string} fieldType - Type of field
     * @returns {string} - Error message
     */
    getErrorMessage(errorType, fieldType) {
        const specificKey = `${fieldType}.${errorType}`;
        return this.errorMessages.get(specificKey) || this.errorMessages.get(errorType);
    }

    /**
     * Show field validation error
     * @param {HTMLElement} field - Input field
     * @param {Array} errors - Array of error messages
     */
    showFieldError(field, errors) {
        // Remove existing error display
        this.clearFieldError(field);

        // Add error styling to field
        field.classList.add('border-red-500', 'dark:border-red-400');
        field.classList.remove('border-slate-300', 'dark:border-slate-600');
        field.classList.add('error-shake');

        // Create error message element
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error text-red-600 dark:text-red-400 text-sm mt-1';
        errorElement.setAttribute('role', 'alert');
        errorElement.setAttribute('aria-live', 'polite');
        errorElement.innerHTML = `
            <div class="flex items-center">
                <span class="material-symbols-outlined text-sm mr-1">error</span>
                <span>${errors[0]}</span>
            </div>
        `;

        // Insert error message after the field
        field.parentNode.insertBefore(errorElement, field.nextSibling);

        // Remove shake animation after it completes
        setTimeout(() => {
            field.classList.remove('error-shake');
        }, 500);

        // Set ARIA attributes for accessibility
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', `${field.id || 'field'}-error`);
        errorElement.id = `${field.id || 'field'}-error`;
    }

    /**
     * Clear field validation error
     * @param {HTMLElement} field - Input field
     */
    clearFieldError(field) {
        // Remove error styling
        field.classList.remove('border-red-500', 'dark:border-red-400', 'error-shake');
        field.classList.add('border-slate-300', 'dark:border-slate-600');

        // Remove error message
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }

        // Remove ARIA attributes
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
    }

    /**
     * Show field validation success
     * @param {HTMLElement} field - Input field
     */
    showFieldSuccess(field) {
        // Clear any existing errors
        this.clearFieldError(field);

        // Add success styling
        field.classList.add('border-green-500', 'dark:border-green-400');
        field.classList.remove('border-slate-300', 'dark:border-slate-600');

        // Add success icon temporarily
        const successIcon = document.createElement('div');
        successIcon.className = 'field-success absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 dark:text-green-400';
        successIcon.innerHTML = '<span class="material-symbols-outlined text-sm success-bounce">check_circle</span>';

        // Position relative parent if needed
        if (getComputedStyle(field.parentNode).position === 'static') {
            field.parentNode.style.position = 'relative';
        }

        field.parentNode.appendChild(successIcon);

        // Remove success styling after 2 seconds
        setTimeout(() => {
            field.classList.remove('border-green-500', 'dark:border-green-400');
            field.classList.add('border-slate-300', 'dark:border-slate-600');
            if (successIcon.parentNode) {
                successIcon.remove();
            }
        }, 2000);
    }

    /**
     * Validate form with real-time feedback
     * @param {HTMLFormElement} form - Form to validate
     * @returns {Object} - Validation result
     */
    validateForm(form) {
        const fields = form.querySelectorAll('input[data-validate], textarea[data-validate], select[data-validate]');
        const results = [];
        let isFormValid = true;

        fields.forEach(field => {
            const validationType = field.dataset.validate || 'text';
            const result = this.validateField(field, validationType);
            results.push(result);

            if (!result.isValid) {
                isFormValid = false;
                this.showFieldError(field, result.errors);
            } else {
                this.showFieldSuccess(field);
            }
        });

        return {
            isValid: isFormValid,
            results: results,
            errors: results.filter(r => !r.isValid).map(r => r.errors).flat()
        };
    }

    /**
     * Set up real-time validation for a field
     * @param {HTMLElement} field - Input field
     * @param {string} type - Validation type
     */
    setupRealtimeValidation(field, type = 'text') {
        let validationTimeout;

        // Validate on input with debounce
        field.addEventListener('input', () => {
            clearTimeout(validationTimeout);
            validationTimeout = setTimeout(() => {
                const result = this.validateField(field, type);
                
                if (field.value.trim() === '') {
                    // Clear validation state for empty fields
                    this.clearFieldError(field);
                } else if (!result.isValid) {
                    this.showFieldError(field, result.errors);
                } else {
                    this.clearFieldError(field);
                }
            }, 300);
        });

        // Validate on blur for immediate feedback
        field.addEventListener('blur', () => {
            clearTimeout(validationTimeout);
            const result = this.validateField(field, type);
            
            if (!result.isValid && field.value.trim() !== '') {
                this.showFieldError(field, result.errors);
            } else if (result.isValid && field.value.trim() !== '') {
                this.showFieldSuccess(field);
            }
        });

        // Clear errors on focus
        field.addEventListener('focus', () => {
            if (field.classList.contains('border-red-500')) {
                this.clearFieldError(field);
            }
        });
    }

    /**
     * Initialize validation for all fields in a container
     * @param {HTMLElement} container - Container element
     */
    initializeValidation(container = document) {
        const fields = container.querySelectorAll('input[data-validate], textarea[data-validate], select[data-validate]');
        
        fields.forEach(field => {
            const validationType = field.dataset.validate || 'text';
            this.setupRealtimeValidation(field, validationType);
        });
    }

    /**
     * Add custom validation rule
     * @param {string} type - Validation type name
     * @param {Object} rules - Validation rules
     * @param {Object} messages - Error messages
     */
    addValidationRule(type, rules, messages = {}) {
        this.validationRules.set(type, rules);
        
        // Add custom error messages
        Object.keys(messages).forEach(key => {
            this.errorMessages.set(`${type}.${key}`, messages[key]);
        });
    }

    /**
     * Remove validation from field
     * @param {HTMLElement} field - Input field
     */
    removeValidation(field) {
        this.clearFieldError(field);
        
        // Remove event listeners by cloning the field
        const newField = field.cloneNode(true);
        field.parentNode.replaceChild(newField, field);
    }

    /**
     * Get validation state for debugging
     * @returns {Object} - Current validation state
     */
    getValidationState() {
        return {
            rules: Object.fromEntries(this.validationRules),
            messages: Object.fromEntries(this.errorMessages),
            validatedFields: Array.from(this.validatedFields)
        };
    }
}

// Create global instance
window.FormValidator = new FormValidator();

// Export for Node.js environment (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormValidator;
}