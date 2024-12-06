<script lang="ts">
    import Sep from "../lib/Separator.svelte";
    import Jobs2 from "./Jobs2.svelte";
    import History from "./History.svelte";
    import { clearToasts } from "../lib/ToastStore";
    let relat ="jobs";
    let itemsPerPage=25;

</script>

<main>
    <div class="wrapper">
        <div class="first-line">
                <label for="pagetop" class="title highlight">Gerenciamento de Jobs:</label>
                <Sep w={3}/>
                <label class="text highlight">
                    <input type="radio" name="relat1" bind:group={relat} value="jobs"/>
                <strong>Jobs em curso</strong></label>
                <label class="text highlight">
                    <input type="radio" name="relat1" bind:group={relat} value="history"/>
                <strong>Histórico</strong></label>
                <Sep w={5}/>
                <label class="text">
                    Itens por página:
                <input class="v_i" type="number" min="10" max="100" name="user" bind:value={itemsPerPage} style="width:50px">
                </label>
                {#if relat==="history"}
                    <History itemsPerPage={itemsPerPage}/>
                {:else if relat==="jobs"}
                    <Jobs2 itemsPerPage={itemsPerPage}/>
                {:else}
                    <p>Indefinido</p>
                {/if}
        </div>
    </div>
</main>

<style>
    @import './common.css';
</style>