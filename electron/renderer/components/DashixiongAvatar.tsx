import React from "react";

interface Props {
  size?: number;
}

/**
 * 大师兄头像 — 可爱的橘猫 SVG
 */
export default function DashixiongAvatar({ size = 28 }: Props) {
  const id = React.useId().replace(/:/g, "_");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: "50%", flexShrink: 0 }}
    >
      <defs>
        {/* Background */}
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFB347" />
          <stop offset="100%" stopColor="#FF8C42" />
        </linearGradient>
        {/* Fur base */}
        <linearGradient id={`${id}fur`} x1="30" y1="20" x2="90" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFB86C" />
          <stop offset="100%" stopColor="#F0943A" />
        </linearGradient>
        {/* Inner ear */}
        <linearGradient id={`${id}ear`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD4A8" />
          <stop offset="100%" stopColor="#FFBF80" />
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle cx="60" cy="60" r="60" fill={`url(#${id}bg)`} />

      {/* Left ear outer */}
      <path d="M22 52 L30 14 L52 40 Z" fill={`url(#${id}fur)`} />
      {/* Left ear inner */}
      <path d="M28 46 L33 20 L48 38 Z" fill={`url(#${id}ear)`} />

      {/* Right ear outer */}
      <path d="M98 52 L90 14 L68 40 Z" fill={`url(#${id}fur)`} />
      {/* Right ear inner */}
      <path d="M92 46 L87 20 L72 38 Z" fill={`url(#${id}ear)`} />

      {/* Face */}
      <ellipse cx="60" cy="66" rx="34" ry="32" fill={`url(#${id}fur)`} />

      {/* Lighter cheeks / muzzle area */}
      <ellipse cx="60" cy="76" rx="22" ry="16" fill="#FFD9A8" />

      {/* Tabby forehead stripes */}
      <path d="M48 44 L44 36" stroke="#E08030" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M60 42 L60 34" stroke="#E08030" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M72 44 L76 36" stroke="#E08030" strokeWidth="2.5" strokeLinecap="round" />

      {/* Eyes */}
      <ellipse cx="45" cy="60" rx="7" ry="7.5" fill="white" />
      <ellipse cx="75" cy="60" rx="7" ry="7.5" fill="white" />
      {/* Pupils */}
      <ellipse cx="46" cy="60" rx="4.5" ry="5.5" fill="#2D2D2D" />
      <ellipse cx="76" cy="60" rx="4.5" ry="5.5" fill="#2D2D2D" />
      {/* Eye highlights */}
      <circle cx="48" cy="57.5" r="2" fill="white" />
      <circle cx="78" cy="57.5" r="2" fill="white" />
      {/* Small secondary highlight */}
      <circle cx="44" cy="62" r="1" fill="white" opacity="0.6" />
      <circle cx="74" cy="62" r="1" fill="white" opacity="0.6" />

      {/* Nose */}
      <path d="M56 72 L60 76 L64 72 Z" fill="#FF8A8A" />

      {/* Mouth */}
      <path d="M60 76 L60 80" stroke="#D07050" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M54 80 Q60 85 66 80" stroke="#D07050" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Whiskers left */}
      <line x1="14" y1="66" x2="38" y2="70" stroke="#E8A860" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="12" y1="74" x2="37" y2="74" stroke="#E8A860" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="14" y1="82" x2="38" y2="78" stroke="#E8A860" strokeWidth="1.3" strokeLinecap="round" />

      {/* Whiskers right */}
      <line x1="106" y1="66" x2="82" y2="70" stroke="#E8A860" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="108" y1="74" x2="83" y2="74" stroke="#E8A860" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="106" y1="82" x2="82" y2="78" stroke="#E8A860" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
