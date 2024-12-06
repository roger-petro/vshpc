
export module Job {
    export interface Row {
            id : string;
            name: string;
            state: string;
            age: string;
            startTime: string;
            queue_wait: number;
            nodes: string;
            cores: number;
            cluster: string;
            user: string;
            account: string;
            partition: string;
            command: string;
            work_dir: string;
            qos: string;
            comment?: string;
    }
    export interface RowExtra {
        id : string;
        comment: string;
        hash : string;
        gitServer: string,
        tag: string
    }
}