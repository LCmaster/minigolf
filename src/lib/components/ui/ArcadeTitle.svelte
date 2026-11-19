<script>
  export let text = "";
  export let gradientId = `arcadeTitleGrad_${Math.random().toString(36).slice(2, 8)}`;
  export let viewBoxWidth = 520;
  export let fontSize = 54;
  export let widthClass = "w-64 md:w-[380px]";
</script>

<svg
  viewBox="0 0 {viewBoxWidth} 88"
  class="{widthClass} h-auto drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)] overflow-visible"
  role="heading"
  aria-level="2"
>
  <defs>
    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="55%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#fb923c" />
    </linearGradient>
  </defs>
  <text
    x={viewBoxWidth / 2}
    y="66"
    text-anchor="middle"
    font-family="'Fredoka', 'Baloo 2', 'Comic Sans MS', system-ui, sans-serif"
    font-weight="900"
    font-size={fontSize}
    letter-spacing="2"
    fill="url(#{gradientId})"
    stroke="#431407"
    stroke-width="14"
    stroke-linejoin="round"
    style="paint-order: stroke fill;"
  >
    {text}
  </text>
</svg>

