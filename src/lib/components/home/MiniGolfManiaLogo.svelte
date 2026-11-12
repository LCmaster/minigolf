<div class="relative select-none pointer-events-none flex justify-center w-full max-w-[460px] mx-auto drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]">
  <svg
    viewBox="0 0 640 250"
    class="w-full h-auto overflow-visible"
    role="img"
    aria-label="Mini Golf Mania"
  >
    <defs>
      <linearGradient id="goldWordGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fff48f" />
        <stop offset="45%" stop-color="#ffcc1a" />
        <stop offset="100%" stop-color="#f97316" />
      </linearGradient>

      <linearGradient id="blueWordGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#a5f3fc" />
        <stop offset="48%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#1d4ed8" />
      </linearGradient>

      <linearGradient id="teeGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e0f2fe" />
        <stop offset="32%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#1d4ed8" />
      </linearGradient>

      <radialGradient id="ballGrad" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="70%" stop-color="#e2e8f0" />
        <stop offset="100%" stop-color="#94a3b8" />
      </radialGradient>

      <filter id="cartoonShadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="6" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.55" />
      </filter>
    </defs>

    <!-- Decorative twinkling stars -->
    <g class="animate-pulse">
      <polygon
        points="82,148 88,162 103,163 91,173 95,187 82,179 69,187 73,173 61,163 76,162"
        fill="#fde047"
        stroke="#78350f"
        stroke-width="3.5"
        stroke-linejoin="round"
      />
      <polygon
        points="556,144 562,158 577,159 565,169 569,183 556,175 543,183 547,169 535,159 550,158"
        fill="#fde047"
        stroke="#78350f"
        stroke-width="3.5"
        stroke-linejoin="round"
      />
      <circle cx="148" cy="42" r="5" fill="#fef08a" />
      <circle cx="496" cy="40" r="6" fill="#7dd3fc" />
    </g>

    <!-- Bottom Line: MAN [TEE-I] A (rendered first so bouncing ball sits cleanly above tee cup) -->
    <g filter="url(#cartoonShadow)">
      <text
        x="366"
        y="214"
        text-anchor="end"
        font-family="'Fredoka', 'Baloo 2', 'Comic Sans MS', system-ui, sans-serif"
        font-weight="900"
        font-size="102"
        letter-spacing="4"
        fill="url(#blueWordGrad)"
        stroke="#0c2d6b"
        stroke-width="16"
        stroke-linejoin="round"
        style="paint-order: stroke fill;"
      >
        MAN
      </text>

      <!-- Golf Tee replacing the "I" directly beneath the bouncing ball -->
      <g class="golf-tee-i" transform="translate(394, 134)">
        <!-- Outer dark outline matching MANIA stroke -->
        <path
          d="M -22,2 Q 0,8 22,2 L 17,15 L 8,21 L 5,78 Q 0,84 -5,78 L -8,21 L -17,15 Z"
          fill="url(#teeGrad)"
          stroke="#0c2d6b"
          stroke-width="13"
          stroke-linejoin="round"
          style="paint-order: stroke fill;"
        />
        <!-- Crisp tee cup rim highlight -->
        <ellipse cx="0" cy="4" rx="18" ry="4" fill="#e0f2fe" opacity="0.9" />
        <!-- Tee stripe accents -->
        <rect x="-6.5" y="30" width="13" height="5" rx="2" fill="#fde047" opacity="0.9" />
      </g>

      <text
        x="422"
        y="214"
        text-anchor="start"
        font-family="'Fredoka', 'Baloo 2', 'Comic Sans MS', system-ui, sans-serif"
        font-weight="900"
        font-size="102"
        letter-spacing="4"
        fill="url(#blueWordGrad)"
        stroke="#0c2d6b"
        stroke-width="16"
        stroke-linejoin="round"
        style="paint-order: stroke fill;"
      >
        A
      </text>

      <!-- Glossy shine highlights inside MANIA -->
      <circle cx="182" cy="160" r="3.5" fill="#ffffff" opacity="0.9" />
      <circle cx="315" cy="156" r="4" fill="#ffffff" opacity="0.85" />
      <circle cx="456" cy="163" r="3" fill="#ffffff" opacity="0.9" />
    </g>

    <!-- Top Line: MINI G [BALL] LF centered symmetrically around x=320 with ball over Tee-I (x=394) -->
    <g filter="url(#cartoonShadow)">
      <text
        x="354"
        y="112"
        text-anchor="end"
        font-family="'Fredoka', 'Baloo 2', 'Comic Sans MS', system-ui, sans-serif"
        font-weight="900"
        font-size="82"
        letter-spacing="2"
        fill="url(#goldWordGrad)"
        stroke="#431407"
        stroke-width="14"
        stroke-linejoin="round"
        style="paint-order: stroke fill;"
      >
        MINI G
      </text>

      <text
        x="434"
        y="112"
        text-anchor="start"
        font-family="'Fredoka', 'Baloo 2', 'Comic Sans MS', system-ui, sans-serif"
        font-weight="900"
        font-size="82"
        letter-spacing="2"
        fill="url(#goldWordGrad)"
        stroke="#431407"
        stroke-width="14"
        stroke-linejoin="round"
        style="paint-order: stroke fill;"
      >
        LF
      </text>

      <!-- Kawaii Golf Ball acting as the "O", poised above the Golf Tee "I" -->
      <g class="kawaii-golf-ball animate-bounce-slow" transform="translate(394, 76)">
        <circle cx="0" cy="0" r="34" fill="url(#ballGrad)" stroke="#1e293b" stroke-width="6" />
        <!-- Subtle golf dimples -->
        <circle cx="-15" cy="-18" r="2.3" fill="#cbd5e1" />
        <circle cx="15" cy="-18" r="2.3" fill="#cbd5e1" />
        <circle cx="21" cy="-5" r="2.1" fill="#cbd5e1" />
        <circle cx="-21" cy="-4" r="2.1" fill="#cbd5e1" />
        <!-- Cute Eyes -->
        <circle cx="-11" cy="-2" r="4.5" fill="#0f172a" />
        <circle cx="11" cy="-2" r="4.5" fill="#0f172a" />
        <circle cx="-12.5" cy="-4" r="1.7" fill="#ffffff" />
        <circle cx="9.5" cy="-4" r="1.7" fill="#ffffff" />
        <!-- Rosy Cheeks -->
        <ellipse cx="-19" cy="6" rx="5" ry="3" fill="#fda4af" opacity="0.85" />
        <ellipse cx="19" cy="6" rx="5" ry="3" fill="#fda4af" opacity="0.85" />
        <!-- Happy Smile -->
        <path
          d="M -7 7 Q 0 15 7 7"
          fill="none"
          stroke="#0f172a"
          stroke-width="3.2"
          stroke-linecap="round"
        />
      </g>
    </g>
  </svg>
</div>

<style>
  @keyframes bounceSlow {
    0%, 100% {
      transform: translate(394px, 78px);
    }
    50% {
      transform: translate(394px, 68px);
    }
  }
  .animate-bounce-slow {
    animation: bounceSlow 2.6s ease-in-out infinite;
  }
</style>
