
<script lang="ts">
  import { getMeta } from './utilities/meta';
  import MgmtView from './pages/MgmtView.svelte';

  let route = getMeta("route");
  route='vshpc.jobsviewer'
</script>


<main>

  {#if route==='vshpc.jobsviewer'}
      <MgmtView />
  {:else}
      <p> Nenhuma rota identificada no meta do html</p>
  {/if}

</main>

<style>

</style>
