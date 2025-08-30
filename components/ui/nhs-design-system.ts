/**
 * NHS Design System - UI Components and Styling
 * Tailored for Multi-Agent Medical Triage Conductor
 */

// NHS Color Palette
export const nhsColors = {
  // Primary NHS colors
  blue: '#005EB8',
  darkBlue: '#003087', 
  lightBlue: '#41B6E6',
  white: '#FFFFFF',
  black: '#231F20',
  
  // NHS semantic colors
  green: '#00A499',      // Success/safe
  red: '#DA291C',        // Emergency/critical
  yellow: '#FFB81C',     // Warning/caution
  orange: '#FA7268',     // Urgent attention
  
  // NHS greys
  grey1: '#F0F4F5',      // Light background
  grey2: '#E8EDEE',      // Border/dividers
  grey3: '#AEB7BD',      // Secondary text
  grey4: '#68747F',      // Muted text
  grey5: '#3F4B53',      // Dark text
  
  // Clinical status colors
  immediate: '#DA291C',   // Red - immediate/resuscitation
  urgent: '#FA7268',      // Orange - urgent
  routine: '#00A499',     // Green - routine
  unknown: '#68747F',     // Grey - unknown/pending
} as const;

// Typography scale (NHS compliant)
export const nhsTypography = {
  fonts: {
    primary: '"Frutiger W02", Arial, sans-serif',
    mono: '"Courier New", monospace',
  },
  sizes: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px  
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px - clinical data
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px - h3
    '3xl': '2rem',      // 32px - h2
    '4xl': '2.5rem',    // 40px - h1
  },
  weights: {
    normal: '400',
    medium: '500', 
    semibold: '600',
    bold: '700',
  },
  lineHeights: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

// Spacing scale (8px grid system)
export const nhsSpacing = {
  px: '1px',
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
} as const;

// Breakpoints for responsive design
export const nhsBreakpoints = {
  sm: '640px',    // Mobile landscape
  md: '768px',    // Tablet portrait
  lg: '1024px',   // Tablet landscape / small desktop
  xl: '1280px',   // Desktop
  '2xl': '1536px' // Large desktop
} as const;

// Component variants for clinical contexts
export const clinicalVariants = {
  risk: {
    immediate: {
      background: nhsColors.red,
      text: nhsColors.white,
      border: nhsColors.red,
      icon: '🚨'
    },
    urgent: {
      background: nhsColors.orange,
      text: nhsColors.white, 
      border: nhsColors.orange,
      icon: '⚠️'
    },
    routine: {
      background: nhsColors.green,
      text: nhsColors.white,
      border: nhsColors.green,
      icon: '✅'
    },
    unknown: {
      background: nhsColors.grey3,
      text: nhsColors.white,
      border: nhsColors.grey3,
      icon: '❓'
    }
  },
  
  confidence: {
    high: {
      background: '#E7F7E7',
      text: nhsColors.green,
      border: nhsColors.green
    },
    medium: {
      background: '#FFF8E1',
      text: nhsColors.yellow,
      border: nhsColors.yellow
    },
    low: {
      background: '#FFEBEE',
      text: nhsColors.red,
      border: nhsColors.red
    }
  }
} as const;

// Animation presets for clinical interfaces
export const nhsAnimations = {
  // Subtle animations for professional feel
  transition: {
    fast: '150ms ease-out',
    normal: '250ms ease-out',
    slow: '350ms ease-out',
  },
  
  // Pulse for critical alerts
  pulse: {
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    keyframes: `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `
  },
  
  // Slide in for notifications
  slideIn: {
    animation: 'slideInRight 300ms ease-out',
    keyframes: `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `
  }
} as const;

// NHS accessibility standards
export const nhsAccessibility = {
  // WCAG 2.1 AAA compliant color contrasts
  contrast: {
    normal: '4.5:1',    // AA standard
    large: '3:1',       // AA for large text
    enhanced: '7:1',    // AAA standard
  },
  
  // Touch targets (minimum 44px for accessibility)
  touchTarget: {
    minimum: '44px',
    recommended: '48px',
  },
  
  // Focus indicators
  focus: {
    outline: `2px solid ${nhsColors.yellow}`,
    outlineOffset: '2px',
  },
  
  // Screen reader classes
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
  }
} as const;

// Clinical interface patterns
export const clinicalPatterns = {
  // Card elevation for medical hierarchy
  cardElevation: {
    subtle: '0 1px 3px rgba(0, 0, 0, 0.1)',
    normal: '0 4px 6px rgba(0, 0, 0, 0.1)', 
    elevated: '0 10px 15px rgba(0, 0, 0, 0.1)',
    critical: '0 20px 25px rgba(218, 41, 28, 0.15)' // Red shadow for critical
  },
  
  // Border radius for clinical feel
  borderRadius: {
    none: '0',
    sm: '4px',
    md: '8px', 
    lg: '12px',
    full: '9999px'
  },
  
  // Medical data table styling
  table: {
    headerBackground: nhsColors.grey1,
    borderColor: nhsColors.grey2,
    hoverBackground: nhsColors.grey1,
    stripedBackground: nhsColors.grey1
  }
} as const;

// Component size variants
export const componentSizes = {
  button: {
    sm: {
      height: '32px',
      padding: '0 12px',
      fontSize: nhsTypography.sizes.sm
    },
    md: {
      height: '40px', 
      padding: '0 16px',
      fontSize: nhsTypography.sizes.base
    },
    lg: {
      height: '48px',  // Accessibility compliant
      padding: '0 24px',
      fontSize: nhsTypography.sizes.lg
    }
  },
  
  input: {
    sm: {
      height: '32px',
      padding: '8px 12px',
      fontSize: nhsTypography.sizes.sm
    },
    md: {
      height: '40px',
      padding: '10px 16px', 
      fontSize: nhsTypography.sizes.base
    },
    lg: {
      height: '48px',  // Touch-friendly
      padding: '12px 16px',
      fontSize: nhsTypography.sizes.lg
    }
  }
} as const;

// Export utility functions for component creation
export const createNHSClassName = (base: string, variants?: Record<string, string>) => {
  return [base, variants && Object.values(variants).join(' ')].filter(Boolean).join(' ');
};

export const getNHSColorFromRisk = (riskLevel: keyof typeof clinicalVariants.risk) => {
  return clinicalVariants.risk[riskLevel];
};

export const formatClinicalValue = (value: number, unit?: string, precision = 1) => {
  return `${value.toFixed(precision)}${unit ? ` ${unit}` : ''}`;
};