import React, { useState } from 'react';
import { Check, Minus } from '@phosphor-icons/react';

/**
 * Componentes de Formulario Avanzados - Estilo Linear
 * Checkbox, Radio, Switch con estilos consistentes
 */

// Checkbox Component
export const Checkbox = ({ 
  label, 
  checked = false, 
  indeterminate = false, 
  disabled = false, 
  onChange, 
  className = '', 
  ...props 
}) => {
  const [isChecked, setIsChecked] = useState(checked);
  const [isIndeterminate, setIsIndeterminate] = useState(indeterminate);

  const handleChange = (e) => {
    const newChecked = e.target.checked;
    setIsChecked(newChecked);
    setIsIndeterminate(false);
    onChange?.(newChecked);
  };

  const checkboxClasses = `
    relative w-4 h-4 rounded-sm border 
    bg-[rgba(255,255,255,0.02)] 
    border-[rgba(255,255,255,0.08)] 
    transition-all duration-200
    focus:outline-none
    focus:border-[var(--ln-accent-violet)]
    focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px]
    ${isChecked ? 'bg-[var(--ln-accent-violet)] border-[var(--ln-accent-violet)]' : ''}
    ${isIndeterminate ? 'bg-[var(--ln-accent-violet)] border-[var(--ln-accent-violet)]' : ''}
    ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `;

  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={isChecked}
          ref={(el) => {
            if (el) el.indeterminate = isIndeterminate;
          }}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div className={checkboxClasses}>
          {isChecked && (
            <Check className="w-3 h-3 text-white absolute top-0.5 left-0.5" weight="bold" />
          )}
          {isIndeterminate && (
            <Minus className="w-3 h-3 text-white absolute top-0.5 left-0.5" weight="bold" />
          )}
        </div>
      </div>
      {label && (
        <span className={`text-[14px] font-[400] text-[var(--ln-text-secondary)] ${
          disabled ? 'opacity-40' : ''
        }`}>
          {label}
        </span>
      )}
    </label>
  );
};

// Radio Component
export const Radio = ({ 
  label, 
  checked = false, 
  disabled = false, 
  onChange, 
  value, 
  name, 
  className = '', 
  ...props 
}) => {
  const [isChecked, setIsChecked] = useState(checked);

  const handleChange = (e) => {
    const newChecked = e.target.checked;
    setIsChecked(newChecked);
    onChange?.(e);
  };

  const radioClasses = `
    relative w-4 h-4 rounded-full border 
    bg-[rgba(255,255,255,0.02)] 
    border-[rgba(255,255,255,0.08)] 
    transition-all duration-200
    focus:outline-none
    focus:border-[var(--ln-accent-violet)]
    focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px]
    ${isChecked ? 'border-[var(--ln-accent-violet)]' : ''}
    ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `;

  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input
          type="radio"
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          value={value}
          name={name}
          className="sr-only"
          {...props}
        />
        <div className={radioClasses}>
          {isChecked && (
            <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-[var(--ln-accent-violet)]" />
          )}
        </div>
      </div>
      {label && (
        <span className={`text-[14px] font-[400] text-[var(--ln-text-secondary)] ${
          disabled ? 'opacity-40' : ''
        }`}>
          {label}
        </span>
      )}
    </label>
  );
};

// Switch Component
export const Switch = ({ 
  label, 
  checked = false, 
  disabled = false, 
  onChange, 
  size = 'default', 
  className = '', 
  ...props 
}) => {
  const [isChecked, setIsChecked] = useState(checked);

  const handleChange = (e) => {
    const newChecked = e.target.checked;
    setIsChecked(newChecked);
    onChange?.(newChecked);
  };

  const sizeClasses = {
    sm: 'w-8 h-5',
    default: 'w-11 h-6',
    lg: 'w-14 h-8'
  };

  const thumbSizeClasses = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const thumbPositionClasses = {
    sm: isChecked ? 'translate-x-3.5' : 'translate-x-0.5',
    default: isChecked ? 'translate-x-5' : 'translate-x-0.5',
    lg: isChecked ? 'translate-x-6.5' : 'translate-x-0.5'
  };

  const switchClasses = `
    ${sizeClasses[size]} 
    relative rounded-full border 
    bg-[rgba(255,255,255,0.02)] 
    border-[rgba(255,255,255,0.08)] 
    transition-all duration-200
    focus:outline-none
    focus:border-[var(--ln-accent-violet)]
    focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px]
    ${isChecked ? 'bg-[var(--ln-accent-violet)] border-[var(--ln-accent-violet)]' : ''}
    ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `;

  const thumbClasses = `
    ${thumbSizeClasses[size]} 
    absolute top-0.5 rounded-full bg-white 
    transition-transform duration-200
    ${thumbPositionClasses[size]}
    ${disabled ? 'opacity-40' : ''}
  `;

  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div className={switchClasses}>
          <div className={thumbClasses} />
        </div>
      </div>
      {label && (
        <span className={`text-[14px] font-[400] text-[var(--ln-text-secondary)] ${
          disabled ? 'opacity-40' : ''
        }`}>
          {label}
        </span>
      )}
    </label>
  );
};

// Select Component (mejorado)
export const Select = ({ 
  label, 
  options = [], 
  placeholder = 'Seleccionar...', 
  error, 
  required = false, 
  disabled = false, 
  className = '', 
  ...props 
}) => {
  const errorClasses = error ? '!border-[#ef4444]/50 !shadow-[rgba(239,68,68,0.4)_0px_0px_0px_2px] focus:!border-[#ef4444] focus:!shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(239,68,68,0.4)_0px_0px_0px_2px]' : '';

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[12px] font-[510] uppercase tracking-wider mb-1.5 text-[var(--ln-text-secondary)]">
          {label}
          {required && <span className="text-[#ef4444] ml-1 font-[590]">*</span>}
        </label>
      )}
      <select
        className={`w-full px-3.5 py-3 font-[var(--font-sans)] text-[16px] font-[400] leading-[1.50] bg-[rgba(255,255,255,0.02)] text-[#d0d6e0] border border-[rgba(255,255,255,0.08)] rounded-md focus:border-[var(--ln-accent-violet)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px,rgba(113,112,255,0.4)_0px_0px_0px_2px] transition-all duration-200 appearance-none bg-image-[url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23d0d6e0' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")] bg-no-repeat bg-right-[12px] bg-center ${errorClasses} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
        disabled={disabled}
        {...props}
      >
        {placeholder && (
          <option value="" className="bg-[var(--ln-bg-surface)] text-[var(--ln-text-secondary)]">
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            className="bg-[var(--ln-bg-surface)] text-[var(--ln-text-secondary)]"
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-[11px] font-[510] text-[#ef4444] px-1 tracking-tight">
          {error}
        </p>
      )}
    </div>
  );
};

// Checkbox Group
export const CheckboxGroup = ({ 
  label, 
  options = [], 
  value = [], 
  onChange, 
  direction = 'vertical', 
  className = '', 
  ...props 
}) => {
  const handleChange = (optionValue, checked) => {
    const newValue = checked 
      ? [...value, optionValue]
      : value.filter(v => v !== optionValue);
    onChange?.(newValue);
  };

  const containerClasses = direction === 'horizontal' 
    ? 'flex flex-wrap gap-4' 
    : 'space-y-3';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-[12px] font-[510] uppercase tracking-wider mb-1.5 text-[var(--ln-text-secondary)]">
          {label}
        </label>
      )}
      <div className={containerClasses}>
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            checked={value.includes(option.value)}
            onChange={(checked) => handleChange(option.value, checked)}
            {...props}
          />
        ))}
      </div>
    </div>
  );
};

// Radio Group
export const RadioGroup = ({ 
  label, 
  options = [], 
  value, 
  onChange, 
  name, 
  direction = 'vertical', 
  className = '', 
  ...props 
}) => {
  const containerClasses = direction === 'horizontal' 
    ? 'flex flex-wrap gap-4' 
    : 'space-y-3';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-[12px] font-[510] uppercase tracking-wider mb-1.5 text-[var(--ln-text-secondary)]">
          {label}
        </label>
      )}
      <div className={containerClasses}>
        {options.map((option) => (
          <Radio
            key={option.value}
            label={option.label}
            value={option.value}
            checked={value === option.value}
            onChange={onChange}
            name={name}
            {...props}
          />
        ))}
      </div>
    </div>
  );
};

export default {
  Checkbox,
  Radio,
  Switch,
  Select,
  CheckboxGroup,
  RadioGroup
};
