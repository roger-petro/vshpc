/* eslint-disable curly */
import { writable } from "svelte/store";

export const toasts = writable([]);

export const addToast = (toast) => {
  // Create a unique ID so we can easily find/remove it
  // if it is dismissible/has a timeout.

  //Veja https://svelte.dev/repl/0091c8b604b74ed88bb7b6d174504f50?version=3.35.0
  const id = Math.floor(Math.random() * 10000);

  // Setup some sensible defaults for a toast.
  const defaults = {
    id,
    type: "info",
    dismissible: true,
    timeout: 3000,
    ftimer: null
    };
  //console.log('Criando toast com id '+ id );
  // Push the toast to the top of the list of toasts

  //nao sei mas só dá para inserir um toast
  // o original inseria todos
  toasts.update((all) => [{ ...defaults, ...toast }, ...all]);

  // If toast is dismissible, dismiss it after "timeout" amount of time.
  if (toast.timeout) toast.ftimer = setTimeout(() => dismissToast(id),toast.timeout);
};

export const dismissToast = (id) => {
  //console.log('Toast com id '+ id + ' sendo dispensado ');
  toasts.update((all) => all.filter((t) => t.id !== id));
};

export const clearToasts = () => {
  toasts.set([]);
};
