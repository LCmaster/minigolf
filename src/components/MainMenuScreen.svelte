<script>
  export let game;
  game.loadMainMenuStage();
</script>

<div class="game-menu">
  <h2 class="title">Mini Golf Mania</h2>
  <div class="options">
    <button on:click={() => {}}>Quick Game (09 holes)</button>
    <button on:click={() => {}}>Long Game (18 holes)</button>
  </div>
</div>

<style>
  .game-menu {
    position: absolute;
    top: 50vh;
    left: 50vw;
    transform: translateX(-50%) translateY(-50%);
  }

  .game-menu .options {
    display: flex;
    gap: 0.5rem;
    flex-direction: column;
  }
</style>
