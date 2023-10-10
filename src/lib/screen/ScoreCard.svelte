<script>
</script>

<table class="w-full">
  <tr>
    <th>Hole</th>
    <th>Par</th>
    <th>Strokes</th>
  </tr>
  {#each [...Array(9).keys()] as hole}
    <tr class="text-center">
      <td>{hole + 1}</td>
      <td>2</td>
      <td>0</td>
    </tr>
  {/each}
  <tr class="font-bold text-center">
    <td>Total</td>
    <td>18</td>
    <td>0</td>
  </tr>
</table>
