<script>
  export let holes;
  export let pars;
  export let shots;
  export let current;
</script>

<table class="w-full max-w-sm mx-auto table-auto border-collapse font-mono text-sm shadow-xl rounded-2xl overflow-hidden bg-surface-900/40 backdrop-blur-md border border-white/10">
  <thead class="bg-surface-800/80 text-white/70 text-xs tracking-wider uppercase">
    <tr>
      <th class="px-4 py-3 text-left">Hole</th>
      <th class="px-4 py-3 text-center">Par</th>
      <th class="px-4 py-3 text-right">Score</th>
    </tr>
  </thead>
  <tbody class="divide-y divide-white/10">
    {#each [...new Array(holes.length)] as _, i (i)}
      <tr class="transition-colors duration-200 {i === current ? 'bg-primary-500/30' : 'hover:bg-surface-700/30'}">
        <td class="px-4 py-2 text-left font-bold {i === current ? 'text-primary-400' : 'text-white/80'}">
          {holes[i]}
        </td>
        <td class="px-4 py-2 text-center {i === current ? 'text-white' : 'text-white/60'}">
          {pars[i]}
        </td>
        <td class="px-4 py-2 text-right font-bold {i === current ? 'text-primary-400' : 'text-white/90'}">
          {shots[i]}
        </td>
      </tr>
    {/each}
  </tbody>
  <tfoot class="bg-surface-800/80 border-t-2 border-white/20 text-white font-bold">
    <tr>
      <td class="px-4 py-3 text-left uppercase tracking-wider text-xs">Total</td>
      <td class="px-4 py-3 text-center">{pars.reduce((prev, curr) => prev + curr, 0)}</td>
      <td class="px-4 py-3 text-right text-primary-400">{shots.reduce((prev, curr) => prev + curr, 0)}</td>
    </tr>
  </tfoot>
</table>
