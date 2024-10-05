{#if show}
<div>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" data-close on:click={overlay_click} transition:fade={{duration: 150}}>
    <div class="modal-container">
      <main>
        <p>{text}</p>
        <span>
          <button on:click={()=>confirm()}>Sim</button><Sep w={4}/><button on:click={()=>show=false}>Cancelar</button>
        </span>
      </main>
    </div>
  </div>
</div>
{/if}

<script lang="ts">
import { fade } from 'svelte/transition';
import { createEventDispatcher } from "svelte";
import Sep from './Separator.svelte';
const dispatch = createEventDispatcher();
export let text='Pergunta não definida'

function confirm() {
  show=false
  dispatch("remove")
}

function overlay_click(e:any) {
    if ('close' in e.target.dataset)
        show = false;
}

export let show = false;
</script>

<style>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.modal-container {
  position: relative;
  background-color: #ffffff;
  width: 60vw;
  margin: 1rem auto 0.2rem;
  box-shadow: 0 3px 10px #555;
}
main {
  padding: 0.5rem;
  font-family: var(--vscode-font-family);
  background-color: var(--vscode-editor-background, white);
  border-style: solid;
  border-color:var(--vscode-editorGroup-border, black);
}
</style>