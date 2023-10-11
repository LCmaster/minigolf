<script>
  import { useGame } from "../useGame";

  const game = useGame();
</script>

<table class="w-full table-auto border-collapse border border-slate-800">
  <thead>
    <tr>
      <th class="uppercase border border-slate-600">Hole</th>
      <th class="uppercase border border-slate-600">Par</th>
      <th class="uppercase border border-slate-600">Strokes</th>
    </tr>
  </thead>
  <tbody>
    {#each $game.stages as stage, i (stage.name)}
      <tr class="text-center">
        <td class="font-bold border border-slate-600">{i + 1}</td>
        <td class="border border-slate-600">{stage.par}</td>
        <td class="border border-slate-600">{$game.stages[i].strokes ?? 0}</td>
      </tr>
    {/each}
    <tr class="font-bold text-center">
      <td class="uppercase border border-slate-600">Total</td>
      <td class="border border-slate-600">
        {$game.stages
          .map((stg) => stg.par)
          .reduce((acc, curr) => acc + curr, 0)}
      </td>
      <td class="border border-slate-600">
        {$game.stages
          .map((stg) => stg.strokes ?? 0)
          .reduce((acc, curr) => acc + curr, 0)}
      </td>
    </tr>
  </tbody>
</table>
