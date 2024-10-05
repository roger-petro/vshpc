import { clocks} from '../pages/common';

import { writable } from 'svelte/store';

export const ticktac = writable(clocks[0]);

let count = 0;
setInterval(() => {
        ticktac.set(clocks[count % clocks.length]);
        count += 1;
}, 1000);
