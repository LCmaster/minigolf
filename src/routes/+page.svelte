<script>
    import Game from '../lib/game.js';
    import {onMount} from "svelte";

    let canvas;

    onMount( () => {
        // const world = new World();
        const game = new Game(canvas);
        game.init();

        window.addEventListener("resize", game.onResize);
        function gameLoop() {
            requestAnimationFrame(gameLoop);

            game.update();
            game.render();
        }
        gameLoop();

        game.dispose();
    });

</script>

<style>
    .webgl {
        width: 100vw;
        min-height: 100vh;
        overflow: hidden;

        /*background-color: black;*/
    }
</style>

<canvas class="webgl" bind:this={canvas}></canvas>