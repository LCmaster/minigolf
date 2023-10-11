<script>
  import { useGame } from "../useGame";

  const game = useGame();
</script>

<table class="w-full">
  <tr>
    <th>Hole</th>
    <th>Par</th>
    <th>Strokes</th>
  </tr>
  {#each $game.stages as stage, i (stage.name)}
    <tr class="text-center">
      <td>{i + 1}</td>
      <td>{stage.par}</td>
      <td>{$game.stages[i].strokes ?? 0}</td>
    </tr>
  {/each}
  <tr class="font-bold text-center">
    <td>Total</td>
    <td>
      {$game.stages.map((stg) => stg.par).reduce((acc, curr) => acc + curr, 0)}
    </td>
    <td>
      {$game.stages
        .map((stg) => stg.strokes ?? 0)
        .reduce((acc, curr) => acc + curr, 0)}
    </td>
  </tr>
</table>
