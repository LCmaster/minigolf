<script>
  export let hole;
  export let par;
</script>

<div class="flex items-end font-acme">
  <div
    class="px-4 pt-4 pb-2 flex flex-col text-black text-center rounded-md rounded-br-none bg-white"
  >
    <h3 class="h3 font-acme text-2xl">Hole</h3>
    <span class="text-4xl">{hole}</span>
  </div>
  <div
    class="px-4 pt-4 pb-2 flex flex-col text-white text-center rounded-md rounded-bl-none bg-[#424242]"
  >
    <h3 class="h3 font-acme text-xl">Par</h3>
    <span class="text-2xl">{par}</span>
  </div>
</div>
