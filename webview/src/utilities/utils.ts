import type { KibanaPaged } from "./kibanaAPI";
import type { Job } from "./row";

/**
 * Converte uma hora em formato iso para a hora local, pressupondo
 *  ela vir em GTM-0, mas sem Z no final
 * @param dateStr Formato de hora ISO sem o Timezone no final (p.ex Z)
 * @returns
 */
export const convertISODate2LocalTime = (dateStr:string, offset:string) => {
    if (offset==="") {
        //quando vindo do slurm o dado já vem com GMT-3
        return dateStr.split('T')[0] + ' ' + dateStr.split('T')[1];
    }
    //quando vem do elastic, pode vir com GMT-0
    let date = new Date(dateStr+offset); //se zulu time, offset deve ser "+03:00"

    return date.toISOString().toLocaleString().split('T')[0] + ' ' +
        date.toISOString().toLocaleString().split('T')[1].split('.')[0];
};

export const convertISOZDate2LocalTime = (isoString: string | number | Date) => {
    const date = new Date(isoString);
    const pad = (s: number) => (s < 10 ? '0' + s : s);

    var year = date.getFullYear();
    var month = pad(date.getMonth() + 1); // Os meses começam do 0
    var day = pad(date.getDate());
    var hour = pad(date.getHours());
    var minute = pad(date.getMinutes());
    var second = pad(date.getSeconds());

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

/**
 * Converte o formato do slurm squeue para a forma curta
 * @param dateStr days-hours:minutes:seconds
 */
export const converSlurmTime2Short = (dateStr: string) : string => {
    let m = dateStr.match(/^(\d+)-(\d+):(\d+):(\d+)$/);
    if (m) {
        let ret = Number(m[1])+Math.round(Number(m[2])*100)/2400; Math.round(Number(m[3])*100)/24*6000;
        ret = Math.floor(ret*10)/10;
        return ret + ' d';
    }
    m = dateStr.match(/^(\d+):(\d+):(\d+)$/);
    if (m) {
        let ret = Number(m[1])+Number(m[2])/60; Number(m[3])/(60*60);
        ret = Math.floor(ret*10)/10;
        return ret + ' h';
    }
    m = dateStr.match(/^(\d+):(\d+)$/);
    if (m) {
        let ret = Number(m[1])+Number(m[2])/60;
        ret = Math.floor(ret*10)/10;
        return ret + ' min';
    }
    m = dateStr.match(/^(\d+)$/);
    if (m) {
        return m[0] + ' s';
    }
    return "Erro!";
};

/**
 * Converte um tempo em segundos para o formato short
 * @param t segundos
 * @returns 1,2 d | 3 min | 10 s | 4.1 h
 */
export const convertSeconds2Short = (t:number) => {
    const secs = t;
    if (secs>=0 && secs<60) {
        return secs.toString()+' s';
    }
    if (secs>=60 && secs<3600) {
        return (Math.round(secs*10/60)/10).toString()+' min';
    }
    if (secs>=3600 && secs<86400) {
        return (Math.round(secs*10/3600)/10).toString()+' h';
    }
    if (secs>=86400) {
        return (Math.round(secs*10/(3600*24))/10).toString()+' d';
    }
    return "0";
};

/**
 * Converte um tempo em segundos para o formato d-HH:mm:ss
 * @param t tempo em segundos
 */
export const convertSeconds2SlurmTime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];

    if (d > 0) {
      parts.push(d + '-');
    }

    if (h > 0) {
      parts.push(h > 9 ? h.toString + ':': '0'.concat(h.toString()+':'));
    }

    if (m > 0) {
      parts.push(m > 9 ? m.toString() + ':' : '0'.concat(m.toString() + ':'));
    }

    if (s > 0) {
      parts.push(s > 9 ? s.toString() : '0'.concat(s.toString()));
    }

    return parts.join('');
};



//console.log(convertSeconds2SlurmTime(61));

//{"id":"2547603","age":"1:06","nodes":"csr1b01n15","partition":"pos","state":"RUNNING",
//"startTime":"2023-01-31T09:33:50","command":"xxxxx",
// "account":"homologa","name":"otim_Sepia_V5_P90.dat.821bff15"}

export const jobInfoOrder : Array<keyof Job.Row>= [
    'id',
    'name',
    'state',
    'age',
    'startTime',
    'queue_wait',
    'nodes',
    'cores',
    'cluster',
    'user',
    'account',
    'partition',
    'command',
    'work_dir',
    'qos'
];
export const convertJobKeyName = (value:string ): string => {
    const translation: { [key: string]: string }  = {
        'id': 'ID',
        'name': 'Nome do Job',
        'state': 'Ultima situação',
        'age': 'Idade',
        'startTime': 'Data de Submissão',
        'nodes': 'Nós',
        'cores': 'Núcleos(cores)',
        'cluster': 'cluster',
        'user': 'Usuário',
        'account': 'Account',
        'partition': 'Fila',
        'command': 'Comando enviado',
        'work_dir': 'Área de Trabalho',
        'queue_wait' : 'Tempo na fila'
    };
    if (Object.hasOwn(translation,value)) {
        return translation[value];
    }
    return '?';
};

/**
 * Veja os campos no KibanaPAged.ts
 * Que vem conforme a query feita
 */
export const histInfoOrder = [
    'jobid',
    'job_name',
    'state', ,
    'elapsed',
    '@submit',
    'nodes',
    'cpus_per_task',
    'cluster',
    'username',
    'account',
    'partition',
    'work_dir',
    'command',
    'queue_wait'
];


/*
"_source": ["@submit", "nodes", "account", "username",
"cluster", "elapsed", "state", "jobid", "job_name",
"work_dir", "cpus_per_task", "partition"]
*/

export const converHistKeyName = (value: string): string => {
    const translation : { [key: string]: string } = {
        'jobid': 'ID',
        'job_name': 'Nome do Job',
        'state': 'Ultima situação',
        'elapsed': 'Tempo',
        '@submit': 'Data de submissão',
        'nodes': 'Nós',
        'cpus_per_task' : 'Núcleos(cores)',
        'cluster' : "Cluster",
        'username' : 'Usuário',
        'account': 'Account',
        'partition': 'Fila',
        'command': 'Comando',
        'work_dir': 'Área de Trabalho',
        'queue_wait' : 'Tempo na fila'
    };
    if (`${value}` in translation) {
        return translation[value];
    }
    return '?';
};

export const formatValue = (key: string, value: string) => {
    if (key === 'startTime' || key === '@submit') {
        return convertISODate2LocalTime(value,"+03:00");
    }
    if ( key === 'elapsed') {
        return convertSeconds2Short(Number(value));
    }
    if (value === undefined) {
        return "Valor não disponível para esta visão";
    }
    if (key=== 'queue_wait') {
        return convertSeconds2Short(Number(value));
    }
    return value;
};

/**
 * Retorna o valor em 'content'
 * de uma entrada no header HTML de nome "meta"="metaName"
 * @param metaName
 * @returns
 */
export function getMeta(metaName: string) {
    const metas = document.getElementsByTagName('meta');
    for (let i = 0; i < metas.length; i++) {
      if (metas[i].getAttribute('name') === metaName) {
        return metas[i].getAttribute('content');
      }
    }
    return '';
}


export function getPromiseFromVScodeEvent(item: EventTarget, event: string, timeout = 10000): Promise<object | null> {
    return new Promise<object | null>((resolve) => {
        let timer: ReturnType<typeof setTimeout> | null = null;

        const listener = (e: Event) => {
            // Convertendo para `unknown` antes de `CustomEvent`
            const data = 'data' in e ? (e as unknown as CustomEvent).detail : (e as any)['detail'];
            item.removeEventListener(event, listener);
            if (timer) {
                clearTimeout(timer);
            }
            resolve(data);
        };

        timer = setTimeout(() => {
            resolve(null);
        }, timeout);

        item.addEventListener(event, listener);
    });
}
