<!-- Tooltip.svelte -->
<script lang="ts">
    export let text = '';

    let tooltipElement: any;
    let showAbove = true;

    // Função para atualizar a posição do tooltip baseada na sua posição na tela
    function updateTooltipPosition() {
        if (text.length>0) {
            const rect = tooltipElement.getBoundingClientRect();
            const tooltipHeight = 120; // Altura aproximada do tooltip, ajuste conforme necessário

            // Verifica se tem espaço suficiente acima, senão mostra abaixo
            if (rect.top < tooltipHeight) {
                showAbove = false;
            } else {
                showAbove = true;
            }
        }
    }

    // Atualiza a posição quando o componente é montado
    import { onMount } from 'svelte';
    onMount(updateTooltipPosition);
</script>

<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if text.length> 0}
    <span class="tooltip" bind:this={tooltipElement} on:mouseover={updateTooltipPosition}>
        <slot></slot>
        <span class="tooltip-content" class:show-above={showAbove} class:show-below={!showAbove}>{text}</span>
    </span>
{:else}
    <span><slot></slot></span>
{/if}
<style>
    .tooltip {
        position: relative;
        display: inline-block;
    }

    .tooltip-content {
        visibility: hidden;
        width: 160px;
        background-color: black;
        color: white;
        text-align: center;
        border-radius: 6px;
        padding: 5px 0;
        position: absolute;
        z-index: 1;
        left: 50%;
        transform: translateX(-50%);
        transition: opacity 0.3s;
        opacity: 0;
    }

    .tooltip:hover .tooltip-content {
        visibility: visible;
        opacity: 1;
    }

    .show-above {
        bottom: 125%; /* Mostra acima do elemento */
    }

    .show-below {
        top: 125%; /* Mostra abaixo do elemento */
    }
</style>