<script>
  export let game;
  game.loadStage("Intro");
</script>

<div class="game-menu">
  <!-- <p>Game Menu</p>
  <div class="options">
    <button on:click={() => game.loadStage("Stage_001")}>Start</button>
  </div> -->
</div>

<style>
  .game-menu {
    position: absolute;
    top: 50vh;
    left: 50vw;
    transform: translateX(-50%) translateY(-50%);
  }
</style>
