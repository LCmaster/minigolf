<script>
  export let holes;
  export let pars;
  export let shots;
  export let current;
</script>

<table class="font-acme variant-filled">
  <thead
    class="font-bold text-center uppercase drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]"
  >
    <tr>
      <td>Hole</td>
      <td>Par</td>
      <td>Score</td>
      <!-- {#each holes as hole, i}
            <td class="text-center rounded-t-md">
              {hole}
            </td>
          {/each} -->
    </tr>
  </thead>
  <tbody
    class="drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)] border-y-2 border-y-solid border-y-white"
  >
    <tr>
      <td />
      <td />
      <td />
    </tr>
    {#each [...new Array(holes.length)] as _, i (i)}
      <tr class={i === current ? "bg-[#7ACC52]" : ""}>
        <td
          class={i === current
            ? "bg-[#7ACC52] rounded-l-full text-center"
            : "text-center"}
        >
          {holes[i]}
        </td>
        <td class="text-center">
          {pars[i]}
        </td>
        <td
          class={i === current
            ? "bg-[#7ACC52] rounded-r-full text-center"
            : "text-center"}
        >
          {shots[i]}
        </td>
      </tr>
    {/each}
    <tr>
      <td />
      <td />
      <td />
    </tr>
  </tbody>
  <tfoot class=" drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
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
