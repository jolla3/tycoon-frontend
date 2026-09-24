// src/features/landing/estate-scene-static.tsx
//
// The equally-usable static version required by section 8/36 for
// prefers-reduced-motion users, and the placeholder shown while the 3D
// canvas chunk is loading. Same visual composition as the 3D scene
// (buildings + a data arc) so there's no jarring swap.
export function EstateSceneStatic() {
  return (
    <svg viewBox="0 0 480 300" width="100%" height="100%" role="img" aria-label="Illustration of a property estate with buildings connected by a payment data line">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F0FBFD" />
          <stop offset="100%" stopColor="#EAF7FA" />
        </linearGradient>
      </defs>
      <rect width="480" height="300" fill="url(#sky)" />
      <rect x="0" y="230" width="480" height="70" fill="#F7FBFC" />

      {[
        { x: 40, w: 55, h: 70 },
        { x: 120, w: 65, h: 110 },
        { x: 210, w: 60, h: 90 },
        { x: 300, w: 55, h: 130 },
        { x: 380, w: 60, h: 75 },
      ].map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={230 - b.h} width={b.w} height={b.h} fill={i % 2 === 0 ? '#EAF2F5' : '#F4F8FA'} stroke="#DCEAEF" />
          <rect x={b.x + b.w * 0.2} y={230 - b.h * 0.65} width={b.w * 0.6} height={6} fill="#48CAE4" opacity={0.6} />
        </g>
      ))}

      <path d="M 60 190 Q 150 90 240 170 T 400 140" stroke="#00B4D8" strokeWidth={2} fill="none" opacity={0.6} />
    </svg>
  );
}
