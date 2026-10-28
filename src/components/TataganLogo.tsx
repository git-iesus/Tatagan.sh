import React from 'react';

interface TataganLogoProps {
  theme?: 'dark' | 'light';
  iconOnly?: boolean;
  size?: number;
}

/**
 * Custom 'T' monoline continuous-stroke logo & TATAGAN.SH wordmark
 * designed in the exact aesthetic of the original Hevy mark
 * (thick uniform rounded stroke, curved outer plates, S-curve stem transition).
 */
export const TataganLogo: React.FC<TataganLogoProps> = ({
  theme = 'dark',
  iconOnly = false,
  size = 26,
}) => {
  const strokeColor = theme === 'dark' ? '#FFFFFF' : '#161618';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9,
        userSelect: 'none',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M 12 40
             L 12 24
             Q 12 12 26 12
             L 74 12
             Q 88 12 88 24
             L 88 40
             Q 88 50 76 50
             L 64 50
             Q 50 50 50 64
             L 50 80
             Q 50 90 39 90
             L 35 90
             Q 26 90 26 80
             L 26 60"
          stroke={strokeColor}
          strokeWidth="11.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {!iconOnly && (
        <span
          style={{
            fontFamily: "'Figtree', sans-serif",
            fontWeight: 800,
            fontSize: Math.round(size * 0.72),
            letterSpacing: '0.07em',
            color: strokeColor,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'baseline',
          }}
        >
          TATAGAN
          <span style={{ color: 'var(--hevy-blue)', fontWeight: 800 }}>.SH</span>
        </span>
      )}
    </div>
  );
};
