<script>
  export let holes;
  export let pars;
  export let shots;
  export let current;
</script>

<table class="font-roboto variant-filled">
  <thead
    class="font-bold text-center uppercase drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]"
  >
    <tr>
      <td class="px-2">Hole</td>
      <td class="px-2">Par</td>
      <td class="px-2">Score</td>
    </tr>
  </thead>
  <tbody
    class="drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)] border-y-2 border-y-solid border-y-white"
  >
    <tr>
      <td />
      <td />
      <td />
    </tr>
    {#each [...new Array(holes.length)] as _, i (i)}
      <tr class={i === current ? "bg-[#7ACC52] " : ""}>
        <td
          class={i === current
            ? "bg-[#7ACC52] rounded-l-full text-center"
            : "text-center"}
        >
          <span class="drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">
            {holes[i]}
          </span>
        </td>
        <td class="text-center">
          <span class="drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">
            {pars[i]}
          </span>
        </td>
        <td
          class={i === current
            ? "bg-[#7ACC52] rounded-r-full text-center"
            : "text-center"}
        >
          <span class="drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">
            {shots[i]}
          </span>
        </td>
      </tr>
    {/each}
    <tr>
      <td />
      <td />
      <td />
    </tr>
  </tbody>
  <tfoot class=" drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">
    <tr>
      <td class="font-bold text-center">Total</td>
      <td class="text-center">
        {pars.reduce((prev, curr) => prev + curr, 0)}
      </td>
      <td class="text-center">
        {shots.reduce((prev, curr) => prev + curr, 0)}
      </td>
    </tr>
  </tfoot>
</table>
