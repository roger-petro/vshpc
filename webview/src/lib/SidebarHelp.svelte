{#if show}
  
  <nav transition:fly={{x: 250, opacity: 1}}>
    <button on:click={() => {show = false; 		dispatch('sidebarClosed', {
			text: 'closed!'
		});}}>Fechar</button>
    <slot></slot>
  </nav>
{/if}




<script>
import { fly } from 'svelte/transition';
import { createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher();
//em transition:fly acima, coloque x=-250 para abrir pela direita

export let show = false;
let modal_show = false;
</script>

<style>
nav {
  position: fixed;
  top: 0;
  right: 0; /* -1 para direita e mude as bordas para right*/
  height: 100%;
  padding: 2rem 1rem 0.6rem;
  border-left-style: solid;
  border-left-width: 1px;
  border-left-color: var(--vscode-editorGroup-border, black);
  background: var(--vscode-editor-background,white);
  overflow-y: auto;
	width: 18rem;
  font-family: var(--vscode-font-family);
  z-index: 500;
}

button {
    padding-top: 3px;
    padding-bottom: 3px;
    text-align: center;
    outline: 1px solid transparent;
    outline-offset: 2px !important;
    color: var(--vscode-button-foreground, white);
    background: var(--vscode-button-background, blue);
    font-family: var(--vscode-font-family);
}

button:hover {
    cursor: pointer;
    background: var(--vscode-button-hoverBackground);
}

  button:focus {
      outline-color: var(--vscode-focusBorder);
  }
</style>