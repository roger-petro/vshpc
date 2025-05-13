<script lang="ts">
    import Sep from '../lib/Separator.svelte';
    import Jobs2 from './Jobs2.svelte';
    import History from './History.svelte';
    import { clearToasts } from '../lib/ToastStore';
    import { vscode } from '../utilities/vscode';
    import Tooltip from '../lib/CustomToolTip.svelte';

    let relat = 'jobs';
    let itemsPerPage = 25;

    let selected = new Set<number>();

    function handleOpenExternal(source: string) {
        if (selected.size > 0) {
            let url = `reports/${source}/line?template=auto&jobids=${Array.from(selected).join(',')}&variableList=Np`;
            vscode.postMessage({ command: 'openExternalBrowser', args: url });
        }
    }
</script>

<main>
    <div class="wrapper">
        <div class="first-line">
            <label for="pagetop" class="title">Gerenciamento de Jobs:</label>
            <Sep w={3} />
            <label class="text">
                <input type="radio" name="relat1" bind:group={relat} value="jobs" />
                <strong>Jobs em curso</strong></label
            >
            <label class="text">
                <input type="radio" name="relat1" bind:group={relat} value="history" />
                <strong>Histórico</strong></label
            >
            <Sep w={5} />
            <label class="text">
                Itens por página:
                <input
                    class="v_i"
                    type="number"
                    min="10"
                    max="100"
                    name="user"
                    bind:value={itemsPerPage}
                    style="width:50px"
                />
            </label>

            {#if relat === 'history'}
                {#if selected.size === 0}
                    <Tooltip
                        text="Para habilitar a simulação deve ter sido colocada no catálogo do V.A.I e selecionada abaixo"
                    >
                        <button disabled>VAI-Poços</button>
                        <button disabled>VAI-Grupos</button>
                    </Tooltip>
                {:else}
                    <button on:click={() => handleOpenExternal('wells')}>VAI-Poços</button>
                    <button on:click={() => handleOpenExternal('rwx')}>VAI-Grupos</button>
                {/if}
                <History {itemsPerPage} bind:selected />
            {:else if relat === 'jobs'}
                <Jobs2 {itemsPerPage} />
            {:else}
                <p>Indefinido</p>
            {/if}
        </div>
    </div>
</main>

<style>
    @import './common.css';
</style>
