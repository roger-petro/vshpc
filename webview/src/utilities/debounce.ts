/**
 * Cria uma função debounce que adia a execução de `fn`
 * até que se passem `delay` milissegundos sem novas chamadas.
 *
 * @param fn – função a ser executada (e.g. chamada de API)
 * @param delay – tempo de espera em ms
 * @returns uma nova função que, quando chamada, reseta o timer
 */
export function debounce<Args extends any[]>(
    fn: (...args: Args) => void,
    delay: number,
): (...args: Args) => void {
    let timer: ReturnType<typeof setTimeout> | null = null;

    return (...args: Args) => {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}


export function debounceAsync<Args extends any[], R>(
  fn: (...args: Args) => Promise<R>,
  delay: number
): (...args: Args) => Promise<R> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingReject: ((reason?: any) => void) | null = null;

  return (...args: Args) => {
    // Se já houver uma chamada pendente, rejeita para limpar qualquer then/catch anterior
    if (pendingReject) {
      pendingReject({ canceled: true });
    }
    clearTimeout(timer!);

    return new Promise<R>((resolve, reject) => {
      pendingReject = reject;
      timer = setTimeout(() => {
        // limpa o reject pendente e executa
        pendingReject = null;
        fn(...args).then(resolve, reject);
      }, delay);
    });
  };
}
