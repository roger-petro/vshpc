<!-- See README.md for documentation on using this. -->
<script>
    //import dialogPolyfill from "dialog-polyfill";
    import { createEventDispatcher } from "svelte";

    // Optional CSS class name to be added to the dialog element.
    export let className = "box";

    // // Parent components can use bind:dialog to get a
    // // reference so they can call show(), showModal(), and close().
    // export let dialog;

    // An optional icon to render in the header before the title.
    export let icon = undefined;

    // Title text to display in the dialog header.
    export let title = "Deseja continuar com a operação?";

    export let confirmDialogCanShow;

    const dispatch = createEventDispatcher();

    const close = (num) => {
        // Parent components can optionally listen for this event.
        //console.log(`Valor de mum: ${JSON.stringify(num)}`);
        if (num === 0 || num === 1) {
            //console.log('Interesse em deletar');
            dispatch("closeDlg", {
              canDelete: num
            });
        }

        // This is not needed if the parent stops rendering this component.
        confirmDialogCanShow = false;
    };
</script>

{#if confirmDialogCanShow}
<section class={className}>

        <div class="header">
            {#if icon}{icon}{/if}
            <span class="title">{title}</span>
        </div>
        <div class="form">
            <span>
                <input class="btn" on:click={()=>close(1)} value="Sim" type="button" />
                <input class="btn" on:click={()=>close(0)} value="Não" type="button" />
            </span>
        </div>

</section>
{/if}

<style>
    .body {
        padding: 10px;
    }

    .header {
        justify-content: space-between;
        font-weight: bold;
    }

    .box {
        margin-top: 5px;
        margin-bottom: 5px;
        padding: 5px;
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        justify-content: center;
        background-color: cornflowerblue;
    }


    .title {
        color: white;
        flex-grow: 1;
        font-size: 18px;
        margin-right: 10px;
    }

    .btn {
        background-color: black;
        border: none;
        color: white;
        font-size: 14px;
        outline: none;
        margin: 0px;
        padding: 5px;
    }


</style>
