/* eslint-disable @typescript-eslint/naming-convention */

import type {KibanaPaged} from './kibanaAPI';
import axios from 'axios';

const urlSearch = "http://localhost:%(proxyPort)s/api/slurm/_search";


const query = `{
    "from": %(from)s,
    "size": %(size)s,
    "sort": [
      {"@submit": {"order": "desc"}}
    ],
    "query":  {
        "bool": {
            "must": [

                {
                    "range": {
                        "@end" : {
                            "gte": "%(startDate)sT00:00:00.000Z",
                            "lte": "%(endDate)sT23:59:59.000Z",
                            "time_zone" : "America/Sao_Paulo"
                        }
                    }
                }
                %(filterUser)s
                %(filterAccount)s
                %(filterState)s
            ]
        }
    },
    "_source": ["@submit", "nodes", "account", "username",
            "cluster", "elapsed", "state", "jobid", "job_name",
            "work_dir", "cpus_per_task", "partition", "queue_wait"]
}`;

const params = {
    'filterUser': '',
    'from': '',
    'size': '',
    'startDate': '',
    'endDate': '',
    'filterState': '',
    'filterAccount': ''
};

//state: CANCELLED, COMPLETED, NODE_FAIL, FAILED
//exit_code: 0:0, 2:0, 4:0

export class KibanaDataSource {
    _proxyPort: string;
    _hitsTotal: number;
    _maxPages: number;
    _startDate: string;
    _endDate: string;
    _from: number;
    _size: number;
    _account: string;
    _filterState: string;
    _filterUser: string;
    _filterAccount: string;

    constructor(user: string, account:string, days:number = 0, state: string='', proxyPort: string = '5173') {
        this._proxyPort = proxyPort;
        this._hitsTotal=0;
        this._maxPages=0;
        this._account = account;
        this._from = 0;
        this._size = 10;
        this._filterUser = user;
        this._filterState = '';
        this._filterAccount = "";
        //a data é calculada na criação do objeto para assegurar
        //que as queries subsequentes serão idênticas

        let first = new Date();
        const endDate = new Date();
        first.setDate(first.getDate() - days);
        this._startDate = first.toISOString().split('T')[0];
        this._endDate = endDate.toISOString().split('T')[0];

        //console.log(`${this._startDate}  ${this._endDate}`)

        if (state.length > 0) {
            this._filterState = `, { "match_phrase": {"state": "${state}"}}`;
        }

        if(account.length > 0) {
            this._filterAccount = `, { "match_phrase": { "account": "${account}" }}`;
        }
        if(user.length > 0) {
            this._filterUser = `, { "match": {"username.keyword" : "${user}" }}`;
        }

    }

    getData = async (pageSize: number, from:number = 0) => {
        //caso o dia tenha sido alterado em relação ao valor
        //quando a instancia foi criada, então zera tudo!

            this._size = pageSize;
            this._from = from;

            params.startDate = this._startDate;
            params.endDate = this._endDate;
            params.from = this._from.toString();
            params.size = this._size.toString();
            params.filterUser = this._filterUser;
            params.filterState = this._filterState;
            params.filterAccount = this._filterAccount;

            console.log(JSON.stringify(params));

            let q = query;
            q = q.replace('%(startDate)s',params.startDate);
            q = q.replace('%(endDate)s',params.endDate);
            q = q.replace('%(from)s',params.from);
            q = q.replace('%(size)s',params.size);
            q = q.replace('%(filterUser)s',params.filterUser);
            q = q.replace('%(filterState)s',params.filterState);
            q = q.replace('%(filterAccount)s',params.filterAccount);

            //console.log(q);
            const response = await axios({
                method: 'POST',
                url: urlSearch.replace('%(proxyPort)s',this._proxyPort),
                data: JSON.parse(q),
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin' : '*'
                }
            });
            if (response && response.status === 200 && response.statusText === 'OK') {
                const respJson = await response.data as KibanaPaged.Frame;
                // console.log('Retorno...');
                // console.log(JSON.stringify(respJson));
                if (respJson.hits.hits.length > 0) {
                    this._hitsTotal = respJson.hits.total.value;
                    this._maxPages = this._hitsTotal > 0 && pageSize > 0 ? this._hitsTotal/pageSize: 0;
                    return respJson;
                } else {
                    //console.log('Não há (mais) sem itens!');
                }
            }
    };


    print = async(resp: KibanaPaged.Frame, _page: number) => {
        if (resp.hits.total.value > 0) {
            for (let idx = 0; idx < resp.hits.hits.length; idx++) {
                const rep = resp.hits.hits[idx]._source;
                //console.log(`${idx + page * this._size}: ${rep['@submit']} ${rep.username} - ${rep.jobid} ${rep.state}, ${rep.elapsed}`);
            }
        }
    };
}

/**
 * Teste! Não apague!
 * usando o typescript no node:
 *  npm i -D tsx
 *  npx tsx kibabaPaged.ts
 *
 * É bom saber que o vite faz o papel de proxy para efeitos de teste,
 * quanto o proxy.ts não entre em cena, quando a extensão estiver em produção.
 */
// (async () => {
//     const kibana = new KibanaDataSource("",'xxxxx',60,"COMPLETED");
//     let from = 0;
//     while (1) {
//         const resp = await kibana.getData(10,from*10);
//         if (!resp || resp.hits.hits.length === 0) {
//             break;
//         }
//         resp && kibana.print(resp, from);
//         from+=1;
//     }
//     console.log(`Total de entradas: ${kibana._hitsTotal}`);
// }
// )();

