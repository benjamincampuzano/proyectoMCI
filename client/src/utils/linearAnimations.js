/**
 * Linear Animation Utilities - Transiciones consistentes
 * Utilidades para animaciones con timing functions y clases predefinidas
 */

// Timing functions según Linear
export const linearTiming = {
  // Linear estándar
  linear: 'cubic-bezier(0, 0, 1, 1)',
  
  // Ease in/out
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Variaciones suaves
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  bouncy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  
  // Rápidas
  fast: 'cubic-bezier(0.11, 0, 0.5, 0)',
  faster: 'cubic-bezier(0.05, 0, 0.2, 0)'
};

// Duraciones estándar
export const linearDurations = {
  instant: '0ms',
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
  slowest: '1000ms'
};

// Clases de animación predefinidas
export const linearAnimations = {
  // Fade animations
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: linearDurations.normal,
    timing: linearTiming.easeOut
  },
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
    duration: linearDurations.normal,
    timing: linearTiming.easeIn
  },
  fadeUp: {
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    duration: linearDurations.normal,
    timing: linearTiming.easeOut
  },
  fadeDown: {
    from: { opacity: 0, transform: 'translateY(-20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    duration: linearDurations.normal,
    timing: linearTiming.easeOut
  },
  fadeLeft: {
    from: { opacity: 0, transform: 'translateX(20px)' },
    to: { opacity: 1, transform: 'translateX(0)' },
    duration: linearDurations.normal,
    timing: linearTiming.easeOut
  },
  fadeRight: {
    from: { opacity: 0, transform: 'translateX(-20px)' },
    to: { opacity: 1, transform: 'translateX(0)' },
    duration: linearDurations.normal,
    timing: linearTiming.easeOut
  },
  
  // Slide animations
  slideUp: {
    from: { transform: 'translateY(100%)' },
    to: { transform: 'translateY(0)' },
    duration: linearDurations.normal,
    timing: linearTiming.easeOut
  },
  slideDown: {
    from: { transform: 'translateY(-100%)' },
    to: { transform: 'translateY(0)' },
    duration: linearDurations.normal,
    timing: linearTiming.easeOut
  },
  slideLeft: {
    from: { transform: 'translateX(100%)' },
    to: { transform: 'translateX(0)' },
    duration: linearDurations.normal,
    timing: linearTiming.easeOut
  },
  slideRight: {
    from: { transform: 'translateX(-100%)' },
    to: { transform: 'translateX(0)' },
    duration: linearDurations.normal,
    timing: linearTiming.easeOut
  },
  
  // Scale animations
  scaleIn: {
    from: { transform: 'scale(0.8)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
    duration: linearDurations.normal,
    timing: linearTiming.easeOut
  },
  scaleOut: {
    from: { transform: 'scale(1)', opacity: 1 },
    to: { transform: 'scale(0.8)', opacity: 0 },
    duration: linearDurations.normal,
    timing: linearTiming.easeIn
  },
  
  // Rotation animations
  rotateIn: {
    from: { transform: 'rotate(-180deg)', opacity: 0 },
    to: { transform: 'rotate(0deg)', opacity: 1 },
    duration: linearDurations.normal,
    timing: linearTiming.easeOut
  },
  rotateOut: {
    from: { transform: 'rotate(0deg)', opacity: 1 },
    to: { transform: 'rotate(180deg)', opacity: 0 },
    duration: linearDurations.normal,
    timing: linearTiming.easeIn
  },
  
  // Bounce animations
  bounceIn: {
    '0%': { transform: 'scale(0.3)', opacity: 0 },
    '50%': { transform: 'scale(1.05)', opacity: 1 },
    '70%': { transform: 'scale(0.9)', opacity: 1 },
    '100%': { transform: 'scale(1)', opacity: 1 },
    duration: linearDurations.slow,
    timing: linearTiming.bouncy
  },
  bounceOut: {
    '0%': { transform: 'scale(1)', opacity: 1 },
    '20%': { transform: 'scale(0.9)', opacity: 1 },
    '50%': { transform: 'scale(1.1)', opacity: 1 },
    '100%': { transform: 'scale(0.3)', opacity: 0 },
    duration: linearDurations.normal,
    timing: linearTiming.bouncy
  }
};

// Generar keyframes para CSS
export const generateKeyframes = (name, animation) => {
  const keyframes = Object.entries(animation)
    .map(([percentage, styles]) => {
      const styleString = Object.entries(styles)
        .map(([prop, value]) => `${prop}: ${value}`)
        .join(', ');
      return `${percentage} { ${styleString} }`;
    })
    .join('\n');
    
  return `@keyframes ${name} {\n${keyframes}\n}`;
};

// Aplicar animación a elemento
export const applyAnimation = (element, animation, options = {}) => {
  if (!element || !animation) return;
  
  const {
    duration = animation.duration || linearDurations.normal,
    timing = animation.timing || linearTiming.easeOut,
    delay = options.delay || '0ms',
    fill = options.fill || 'forwards'
  } = options;
  
  const animationString = `${generateAnimationString(animation)} ${duration} ${timing} ${delay} ${fill}`;
  element.style.animation = animationString;
  
  return () => {
    element.style.animation = '';
  };
};

// Generar string de animación
export const generateAnimationString = (animation) => {
  if (animation.keyframes) {
    return animation.keyframes;
  }
  
  if (animation.from && animation.to) {
    return `${Object.entries(animation.from).map(([prop, value]) => `${prop}: ${value}`).join(', ')} to ${Object.entries(animation.to).map(([prop, value]) => `${prop}: ${value}`).join(', ')}`;
  }
  
  return '';
};

// Hook para animaciones
export const useAnimation = (animation, dependencies = []) => {
  const elementRef = React.useRef(null);
  const [isAnimating, setIsAnimating] = React.useState(false);
  
  React.useEffect(() => {
    const element = elementRef.current;
    if (!element || !animation) return;
    
    setIsAnimating(true);
    const cleanup = applyAnimation(element, animation);
    
    return () => {
      cleanup();
      setIsAnimating(false);
    };
  }, dependencies);
  
  return { elementRef, isAnimating };
};

// Hook para animaciones con trigger
export const useTriggerAnimation = (animation) => {
  const elementRef = React.useRef(null);
  const [isAnimating, setIsAnimating] = React.useState(false);
  
  const trigger = React.useCallback(() => {
    const element = elementRef.current;
    if (!element || !animation || isAnimating) return;
    
    setIsAnimating(true);
    const cleanup = applyAnimation(element, animation);
    
    setTimeout(() => {
      cleanup();
      setIsAnimating(false);
    }, parseInt(animation.duration || linearDurations.normal));
  }, [animation, isAnimating]);
  
  return { elementRef, isAnimating, trigger };
};

// Clases CSS para Tailwind
export const linearAnimationClasses = {
  // Fade
  'fade-in': 'animate-fade-in',
  'fade-out': 'animate-fade-out',
  'fade-up': 'animate-fade-up',
  'fade-down': 'animate-fade-down',
  'fade-left': 'animate-fade-left',
  'fade-right': 'animate-fade-right',
  
  // Slide
  'slide-up': 'animate-slide-up',
  'slide-down': 'animate-slide-down',
  'slide-left': 'animate-slide-left',
  'slide-right': 'animate-slide-right',
  
  // Scale
  'scale-in': 'animate-scale-in',
  'scale-out': 'animate-scale-out',
  
  // Spin
  'spin': 'animate-spin',
  'spin-slow': 'animate-spin-slow',
  'ping': 'animate-ping',
  'pulse': 'animate-pulse',
  'bounce': 'animate-bounce',
  
  // Special
  'shimmer': 'animate-shimmer',
  'glow': 'animate-glow',
  'float': 'animate-float'
};

// CSS para las animaciones (debe incluirse en el proyecto)
export const linearAnimationCSS = `
/* Linear Animations */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fade-down {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes slide-down {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}

@keyframes slide-left {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes slide-right {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

@keyframes scale-in {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes scale-out {
  from { transform: scale(1); opacity: 1; }
  to { transform: scale(0.8); opacity: 0; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% { transform: translateY(0); }
  40%, 43% { transform: translateY(-30px); }
  70% { transform: translateY(-15px); }
  90% { transform: translateY(-4px); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

/* Animation Classes */
.animate-fade-in { animation: fade-in ${linearDurations.normal} ${linearTiming.easeOut} forwards; }
.animate-fade-out { animation: fade-out ${linearDurations.normal} ${linearTiming.easeIn} forwards; }
.animate-fade-up { animation: fade-up ${linearDurations.normal} ${linearTiming.easeOut} forwards; }
.animate-fade-down { animation: fade-down ${linearDurations.normal} ${linearTiming.easeOut} forwards; }
.animate-slide-up { animation: slide-up ${linearDurations.normal} ${linearTiming.easeOut} forwards; }
.animate-slide-down { animation: slide-down ${linearDurations.normal} ${linearTiming.easeOut} forwards; }
.animate-slide-left { animation: slide-left ${linearDurations.normal} ${linearTiming.easeOut} forwards; }
.animate-slide-right { animation: slide-right ${linearDurations.normal} ${linearTiming.easeOut} forwards; }
.animate-scale-in { animation: scale-in ${linearDurations.normal} ${linearTiming.easeOut} forwards; }
.animate-scale-out { animation: scale-out ${linearDurations.normal} ${linearTiming.easeIn} forwards; }
.animate-spin { animation: spin ${linearDurations.slow} ${linearTiming.linear} infinite; }
.animate-spin-slow { animation: spin ${linearDurations.slowest} ${linearTiming.linear} infinite; }
.animate-bounce { animation: bounce ${linearDurations.slow} ${linearTiming.bouncy} infinite; }
.animate-pulse { animation: pulse ${linearDurations.slow} ${linearTiming.easeInOut} infinite; }
.animate-shimmer { animation: shimmer ${linearDurations.slow} ${linearTiming.linear} infinite; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent); background-size: 200% 100%; }
.animate-glow { animation: glow ${linearDurations.slow} ${linearTiming.easeInOut} infinite; }
.animate-float { animation: float ${linearDurations.slowest} ${linearTiming.easeInOut} infinite ease-in-out; }
`;

// Utilidades para transiciones
export const linearTransitions = {
  // Standard transitions
  fade: 'opacity 0.2s ease-out',
  slide: 'transform 0.2s ease-out',
  scale: 'transform 0.2s ease-out',
  colors: 'color 0.2s ease-out, background-color 0.2s ease-out, border-color 0.2s ease-out',
  
  // Complex transitions
  all: 'all 0.2s ease-out',
  transform: 'transform 0.2s ease-out',
  
  // Fast transitions
  fastFade: 'opacity 0.15s ease-out',
  fastSlide: 'transform 0.15s ease-out',
  
  // Slow transitions
  slowFade: 'opacity 0.3s ease-out',
  slowSlide: 'transform 0.3s ease-out'
};

export default {
  linearTiming,
  linearDurations,
  linearAnimations,
  linearAnimationClasses,
  linearTransitions,
  generateKeyframes,
  applyAnimation,
  generateAnimationString,
  useAnimation,
  useTriggerAnimation,
  linearAnimationCSS
};
