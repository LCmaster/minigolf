<script>
  export let holes;
  export let pars;
  export let strokes;
</script>

<div class="table-container">
  <table class="table">
    <thead>
      <tr>
        <td class="font-bold text-center">Hole</td>
        {#each holes as hole, i}
          <td class="text-center rounded-t-md">
            {hole}
          </td>
        {/each}
        <td class="font-bold text-center">Total</td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="font-bold text-center">Par</td>
        {#each pars as par, i}
          <td class="text-center">
            {par}
          </td>
        {/each}
        <td class="font-bold text-center"
          >{pars.reduce((prev, curr) => prev + curr, 0)}</td
        >
      </tr>
      <tr>
        <td class="font-bold text-center">Score</td>
        {#each strokes as shots, i}
          <td class="text-center">
            {shots}
          </td>
        {/each}
        <td class="font-bold text-center"
          >{strokes.reduce((prev, curr) => prev + curr, 0)}</td
        >
      </tr>
    </tbody>
  </table>
</div>
