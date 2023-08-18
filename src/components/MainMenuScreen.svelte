<script>
  export let game;
  game.loadStage("MainMenu.glb");
</script>

<div class="game-menu">
  <!-- <div class="options">
    <button on:click={() => game.loadStage("Stage_001")}>Quick Game</button>
    <button on:click={() => game.loadStage("Stage_001")}>Long Game</button>
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
