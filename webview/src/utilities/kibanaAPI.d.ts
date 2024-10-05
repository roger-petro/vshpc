
/**
 * Exportação feita pelo dado graças ao json2ts.com
 */


/**
 * API caso use o modo paginado
 */

export module KibanaPaged {

    export interface Shards {
        total: number;
        successful: number;
        skipped: number;
        failed: number;
    }

    export interface Total {
        value: number;
        relation: string;
    }

    export interface Source {
        jobid: number;
        job_name: string;
        state: string;
        elapsed: number;
        "@submit": string;
        nodes: string;
        cpus_per_task: string;
        cluster: string;
        username: string;
        account: string;
        partition: string;
        work_dir : string;
        command: string;
        queue_wait : string;

    }

    export interface Hit {
        _index: string;
        _type: string;
        _id: string;
        _score?: any;
        _source: Source;
        sort: any[];
    }

    export interface Hits {
        total: Total;
        max_score?: any;
        hits: Hit[];
    }

    export interface Frame {
        took: number;
        timed_out: boolean;
        _shards: Shards;
        hits: Hits;
    }

}
