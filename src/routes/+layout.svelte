<style>
    :global(*, *::before, *::after) {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    :global(.app) {
        width: 100vw;
        min-height: 100vh;
        overflow: hidden;
        position: fixed;
        top: 0;
        left: 0;
    }
</style>
<slot/>