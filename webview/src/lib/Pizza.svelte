<script>
    import { onMount, onDestroy } from 'svelte';
  
    export let duration = 5000; // duração total da animação em milissegundos
    export let size = 100; // tamanho do círculo SVG em pixels
    export let progress = 0; // progresso de 0 a 100
    export let pause = false;
    let interval;
  
    function updateProgress() {
      if (!pause) progress += 100 * (50 / duration); // Incrementa o progresso
      if (progress >= 100) {
        clearInterval(interval); // Para o intervalo quando atinge 100%
        progress = 100;
      }
    }
  
    onMount(() => {
      interval = setInterval(updateProgress, 50); // Atualiza o progresso a cada 50ms
      return onDestroy(() => {
        clearInterval(interval); // Limpa o intervalo quando o componente é destruído
      });
    });
  </script>
  
  <svg width="{size}" height="{size}" viewBox="0 0 36 36" class="circular-chart">
    <path class="circle-bg"
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#eee"
          stroke-width="4" />
  
    <path class="circle"
          stroke-dasharray="{progress}, 100"
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="blue"
          stroke-width="4"
          stroke-linecap="round"
          style="transform: rotate(-90deg); transform-origin: center;" />
  </svg>
  
  <style>
    .circular-chart {
      display: inline-block;
      margin: 0px auto;
      max-width: 100%;
      max-height: 100%;
    }
  
    .circle-bg {
      fill: none;
      stroke: #eee;
      stroke-width: 3.5;
    }
  
    .circle {
      fill: none;
      stroke: #05a;
      stroke-width: 3.5;
      stroke-linecap: round;
      animation: progress 1s ease-out forwards;
    }
  
    @keyframes progress {
      0% {
        stroke-dasharray: 0 100;
      }
    }
  </style>
  