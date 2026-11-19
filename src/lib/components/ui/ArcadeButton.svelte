<script>
  export let label = "";
  export let href = undefined;
  export let variant = "green"; // "green" | "amber" | "blue" | "red" | "purple" | "cream"
  export let size = "md"; // "sm" | "md" | "lg" | "orb"
  export let type = "button";
  export let disabled = false;
  export let title = undefined;
  export let ariaLabel = undefined;
  export let extraClass = "";

  const VARIANT_CLASSES = {
    green: "bg-gradient-to-b from-lime-400 to-emerald-600 text-white border-white ring-[#14532d] shadow-[0_4px_0_#14532d]",
    amber: "bg-gradient-to-b from-amber-300 to-orange-500 text-[#431407] border-white ring-[#78350f] shadow-[0_4px_0_#78350f]",
    blue: "bg-gradient-to-b from-sky-400 to-blue-600 text-white border-white ring-[#1e3a8a] shadow-[0_4px_0_#1e3a8a]",
    red: "bg-gradient-to-b from-rose-400 via-red-500 to-red-700 text-white border-white ring-[#431407] shadow-[0_4px_0_#431407]",
    purple: "bg-gradient-to-b from-fuchsia-400 to-purple-600 text-white border-white ring-[#4a044e] shadow-[0_4px_0_#4a044e]",
    cream: "bg-amber-50/95 text-[#431407] border-[#431407] ring-[#431407]/30 shadow-[0_3px_0_#431407]",
  };

  const SIZE_CLASSES = {
    sm: "rounded-xl px-3 py-1.5 text-xs border-2 ring-1",
    md: "rounded-full px-5 py-2 text-sm border-[3px] ring-2",
    lg: "rounded-full px-7 py-3 text-base tracking-wide border-[3px] ring-2",
    orb: "w-11 h-11 rounded-full border-[3px] ring-2 text-lg",
  };

  $: computedClass = [
    "inline-flex items-center justify-center gap-1.5 font-black transition-all cursor-pointer select-none",
    "hover:brightness-110 hover:scale-[1.03] active:translate-y-0.5 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100",
    VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.green,
    SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
    extraClass,
  ].join(" ");
</script>

{#if href}
  <a
    {href}
    {title}
    aria-label={ariaLabel}
    class={computedClass}
    on:click
  >
    <slot>{label}</slot>
  </a>
{:else}
  <button
    {type}
    {disabled}
    {title}
    aria-label={ariaLabel}
    class={computedClass}
    on:click
  >
    <slot>{label}</slot>
  </button>
{/if}

