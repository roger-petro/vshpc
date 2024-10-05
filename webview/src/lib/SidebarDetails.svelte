{#if show}

  <nav transition:fly={{x: 250, opacity: 1}}>
    <button on:click={() => {show = false}}>Fechar</button>
    <slot></slot>
    {#if selection}
      <div class="grid1">
        <div class="grid1-header">Campo</div>
        <div class="grid1-header">Valor</div>
        {#each Object.keys(selection) as key}
          <div class="grid1-column grid1-firstcolumn">{key}:</div>
          <div class="grid1-column">{breakine(selection[key])}</div>
        {/each}
      </div>
    {/if}
  </nav>
{/if}


<script>
import { fly } from 'svelte/transition';
import { createEventDispatcher } from 'svelte';
export let selection;
const dispatch = createEventDispatcher();
//em transition:fly acima, coloque x=-250 para abrir pela direita

function stringToChanks(string, chunkSize) {
    const chunks = [];
    while (string.length > 0) {
        chunks.push(string.substring(0, chunkSize));
        string = string.substring(chunkSize, string.length);
    }
    return chunks
}

export let show = false;

function breakine(line) {
  if (line && line.length > 77) {
    return stringToChanks(line,77).join('\n')
  }
  return line;
}

</script>

<style>
nav {
  position: fixed;
  top: 0;
  right: 0; /* -1 para direita e mude as bordas para right*/
  height: 100%;
  padding: 3rem 0.5rem 1rem;
  border-left-style: solid;
  border-left-width: 1px;
  border-left-color: var(--vscode-editorGroup-border, black);
  background: var(--vscode-editor-background,white);
  overflow-y: auto;
	width: 800px;
  font-family: var(--vscode-font-family);
  z-index: 500;
}

.grid1 {
    display: grid;
    grid-template-columns: 0.2fr 0.8fr ;

}
.grid1-header {
    border-bottom: solid;
    border-width: 2px;
    border-color: var(--vscode-notebook-cellBorderColor);
    font-weight: bold;

}

.grid1-firstcolumn {
  border-left: solid;
  border-width: 1px;
  border-color: var(--vscode-notebook-cellBorderColor);
}
.grid1-column {
    border-bottom: solid;
    border-right: solid;
    padding-left: 5px;
    border-width: 1px;
    border-color: var(--vscode-notebook-cellBorderColor);
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