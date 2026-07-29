import React from 'react';
import { TeaType, MugType } from '../types';

interface TeaBagIconProps {
  tea: TeaType;
  className?: string;
  size?: number;
}

export const TeaBagIcon: React.FC<TeaBagIconProps> = ({ tea, className = '', size = 56 }) => {
  const { id, bagColor, teaColor, specialEffect } = tea;

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size * 1.15 }}>
      <svg
        width={size}
        height={size * 1.15}
        viewBox="0 0 60 70"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-md transition-transform hover:scale-105"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id={`bagGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#f5f5f4" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#e7e5e4" stopOpacity="0.75" />
          </linearGradient>

          <linearGradient id={`tagGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={bagColor} />
            <stop offset="100%" stopColor={adjustColor(bagColor, -30)} />
          </linearGradient>

          <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* String from Tag to Bag */}
        <path
          d="M 16 12 Q 22 2 30 18"
          stroke="#d6d3d1"
          strokeWidth="1.5"
          strokeDasharray="2 1.5"
          fill="none"
        />

        {/* Paper Tag */}
        <g transform="translate(6, 4) rotate(-12 12 12)">
          <rect
            x="2"
            y="2"
            width="18"
            width-override="18"
            height="22"
            rx="3"
            fill={`url(#tagGrad-${id})`}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1"
          />
          {/* Hole Punch in Tag */}
          <circle cx="11" cy="6" r="1.8" fill="#1c1917" stroke="#ffffff" strokeWidth="0.5" />
          {/* Tag Motif / Emblem */}
          {id === 'earl_grey' && (
            <path d="M 11 11 Q 7 14 11 18 Q 15 14 11 11 Z" fill="#ffffff" opacity="0.9" />
          )}
          {id === 'chamomile' && (
            <circle cx="11" cy="14" r="3" fill="#fef08a" />
          )}
          {id === 'matcha_green' && (
            <path d="M 8 13 C 8 10, 14 10, 14 13 C 14 16, 8 16, 8 13 Z" fill="#4ade80" />
          )}
          {id === 'english_breakfast' && (
            <path d="M 7 17 L 9 11 L 11 14 L 13 11 L 15 17 Z" fill="#fcd34d" />
          )}
          {id === 'mint_breeze' && (
            <path d="M 11 10 C 6 13, 11 18, 11 18 C 11 18, 16 13, 11 10 Z" fill="#cffaff" />
          )}
        </g>

        {/* Tea Bag Filter Body (Trapezoid) */}
        <path
          d="M 18 18 L 42 18 L 48 58 Q 48 62 44 62 L 16 62 Q 12 62 12 58 Z"
          fill={`url(#bagGrad-${id})`}
          stroke="#d6d3d1"
          strokeWidth="1.2"
        />

        {/* Metallic Staple at Top */}
        <rect x="26" y="17" width="8" height="2.5" rx="1" fill="#78716c" stroke="#e7e5e4" strokeWidth="0.5" />

        {/* Inner Tea Blend Pouch */}
        <path
          d="M 21 26 L 39 26 L 43 54 Q 43 57 40 57 L 20 57 Q 17 57 17 54 Z"
          fill={teaColor}
          opacity="0.82"
        />

        {/* Tea Specks / Herbs Texture */}
        <circle cx="25" cy="34" r="1.2" fill="#27272a" opacity="0.4" />
        <circle cx="35" cy="38" r="1.5" fill="#27272a" opacity="0.4" />
        <circle cx="28" cy="48" r="1.3" fill="#27272a" opacity="0.4" />
        <circle cx="33" cy="44" r="1.1" fill="#27272a" opacity="0.4" />

        {/* Detailed Specialty Effect Overlay inside Icon */}
        {specialEffect === 'leaves' && (
          <g>
            <circle cx="30" cy="38" r="4" fill="#fef08a" opacity="0.9" />
            <path d="M 24 38 Q 30 34 36 38 Q 30 42 24 38 Z" fill="#ffffff" opacity="0.7" />
          </g>
        )}
        {specialEffect === 'glow' && (
          <circle cx="30" cy="40" r="10" fill="#4ade80" opacity="0.35" filter={`url(#glow-${id})`} />
        )}
        {specialEffect === 'sparkles' && (
          <g fill="#fcd34d" opacity="0.9">
            <path d="M 30 32 L 31.5 35.5 L 35 37 L 31.5 38.5 L 30 42 L 28.5 38.5 L 25 37 L 28.5 35.5 Z" />
          </g>
        )}
        {specialEffect === 'mint' && (
          <g fill="#a5f3fc" opacity="0.9">
            <path d="M 26 36 Q 30 30 34 36 Q 30 42 26 36 Z" />
            <circle cx="35" cy="32" r="1.5" fill="#ffffff" />
          </g>
        )}

        {/* Paper Fold Crease Line */}
        <line x1="18" y1="22" x2="42" y2="22" stroke="#a8a29e" strokeWidth="0.8" opacity="0.6" />
      </svg>
    </div>
  );
};

interface MugIconProps {
  mug: MugType;
  className?: string;
  size?: number;
}

export const MugIcon: React.FC<MugIconProps> = ({ mug, className = '', size = 56 }) => {
  const { id, color, rimColor, pattern, widthRatio } = mug;

  // Scale mug dimensions according to type
  const baseWidth = 34 * widthRatio;
  const mugX = 35 - baseWidth / 2;

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 70 70"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-md transition-transform hover:scale-105"
      >
        <defs>
          <linearGradient id={`mugBodyGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={adjustColor(color, -18)} />
            <stop offset="35%" stopColor={color} />
            <stop offset="85%" stopColor={adjustColor(color, -10)} />
            <stop offset="100%" stopColor={adjustColor(color, -25)} />
          </linearGradient>

          <linearGradient id={`teaLiquidGrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
        </defs>

        {/* Steam Wisps */}
        <g stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" fill="none">
          <path d="M 30 18 Q 28 12 32 6" opacity="0.7" />
          <path d="M 36 20 Q 38 14 34 8" opacity="0.8" />
          <path d="M 42 18 Q 40 12 44 6" opacity="0.6" />
        </g>

        {/* Handle(s) */}
        {id === 'giant_soup_mug' ? (
          // Dual Soup Bowl Ear Handles
          <g stroke={adjustColor(color, -20)} strokeWidth="4.5" fill="none" strokeLinecap="round">
            <path d={`M ${mugX - 1} 32 C ${mugX - 9} 32, ${mugX - 9} 48, ${mugX - 1} 48`} />
            <path d={`M ${mugX + baseWidth + 1} 32 C ${mugX + baseWidth + 9} 32, ${mugX + baseWidth + 9} 48, ${mugX + baseWidth + 1} 48`} />
          </g>
        ) : (
          // Single Right Handle
          <path
            d={`M ${mugX + baseWidth - 1} 28 C ${mugX + baseWidth + 14} 28, ${mugX + baseWidth + 14} 52, ${mugX + baseWidth - 1} 52`}
            stroke={adjustColor(color, -20)}
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Main Mug Body */}
        {id === 'vintage_floral' ? (
          // Flared Teacup Shape
          <path
            d={`M ${mugX - 3} 24 L ${mugX + baseWidth + 3} 24 L ${mugX + baseWidth - 2} 50 Q ${mugX + baseWidth - 4} 58 35 58 Q ${mugX + 4} 58 ${mugX + 2} 50 Z`}
            fill={`url(#mugBodyGrad-${id})`}
            stroke={rimColor}
            strokeWidth="1.5"
          />
        ) : id === 'thermos_flask' ? (
          // Tall Thermos Tumbler
          <rect
            x={mugX}
            y={22}
            width={baseWidth}
            height={38}
            rx="4"
            fill={`url(#mugBodyGrad-${id})`}
            stroke="#64748b"
            strokeWidth="1.5"
          />
        ) : (
          // Standard Ceramic Cylinder
          <path
            d={`M ${mugX} 24 L ${mugX + baseWidth} 24 L ${mugX + baseWidth} 54 Q ${mugX + baseWidth} 58 35 58 Q ${mugX} 58 ${mugX} 54 Z`}
            fill={`url(#mugBodyGrad-${id})`}
            stroke={adjustColor(color, -30)}
            strokeWidth="1"
          />
        )}

        {/* Pattern Details on Body */}
        {pattern === 'stripes' && (
          <g stroke="#38bdf8" strokeWidth="2.5" opacity="0.85">
            <line x1={mugX + 2} y1="34" x2={mugX + baseWidth - 2} y2="34" />
            <line x1={mugX + 2} y1="42" x2={mugX + baseWidth - 2} y2="42" />
            <line x1={mugX + 2} y1="50" x2={mugX + baseWidth - 2} y2="50" />
          </g>
        )}

        {pattern === 'floral' && (
          <g fill="#f472b6">
            <circle cx="30" cy="40" r="3" fill="#f472b6" />
            <circle cx="38" cy="44" r="2.5" fill="#f472b6" />
            <circle cx="30" cy="40" r="1" fill="#fef08a" />
            <circle cx="38" cy="44" r="0.8" fill="#fef08a" />
          </g>
        )}

        {pattern === 'dots' && (
          <g fill="#ffffff" opacity="0.85">
            {/* Cable knit stitch texture */}
            <path d={`M ${mugX + 6} 30 L ${mugX + 12} 36 M ${mugX + 12} 30 L ${mugX + 6} 36`} stroke="#ffffff" strokeWidth="1.5" />
            <path d={`M ${mugX + 18} 30 L ${mugX + 24} 36 M ${mugX + 24} 30 L ${mugX + 18} 36`} stroke="#ffffff" strokeWidth="1.5" />
            <path d={`M ${mugX + 6} 42 L ${mugX + 12} 48 M ${mugX + 12} 42 L ${mugX + 6} 48`} stroke="#ffffff" strokeWidth="1.5" />
            <path d={`M ${mugX + 18} 42 L ${mugX + 24} 48 M ${mugX + 24} 42 L ${mugX + 18} 48`} stroke="#ffffff" strokeWidth="1.5" />
          </g>
        )}

        {pattern === 'gold' && (
          <rect x={mugX} y="38" width={baseWidth} height="6" fill="#cbd5e1" />
        )}

        {/* Glossy Surface Highlight */}
        <path
          d={`M ${mugX + 3} 26 L ${mugX + 6} 26 L ${mugX + 6} 52 L ${mugX + 3} 52 Z`}
          fill="#ffffff"
          opacity="0.2"
        />

        {/* Top Liquid Surface Ellipse */}
        <ellipse
          cx="35"
          cy="24"
          rx={baseWidth / 2 - 1}
          ry="5"
          fill={`url(#teaLiquidGrad-${id})`}
        />

        {/* Rim Ring */}
        <ellipse
          cx="35"
          cy="24"
          rx={baseWidth / 2}
          ry="5.5"
          fill="none"
          stroke={rimColor}
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};

// Helper function to lighten / darken hex colors for SVG gradients
function adjustColor(hex: string, percent: number): string {
  let num = parseInt(hex.replace('#', ''), 16);
  if (isNaN(num)) return hex;
  let amt = Math.round(2.55 * percent);
  let R = (num >> 16) + amt;
  let G = ((num >> 8) & 0x00ff) + amt;
  let B = (num & 0x0000ff) + amt;

  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}
