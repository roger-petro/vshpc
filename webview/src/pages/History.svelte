
<script lang="ts">
    import { vscode } from "../utilities/vscode";
    import { onMount, onDestroy } from "svelte";
    import Sep from "../lib/Separator.svelte";
    import Toasts from "../lib/Toasts.svelte";
    import { addToast } from "../lib/ToastStore";
    import { ticktac } from "../utilities/clockStore";

    import {
        convertISODate2LocalTime,
        formatValue,
        getMeta,
        convertSeconds2Short,
        converHistKeyName,
        histInfoOrder
    } from "../utilities/utils";
    import type { KibanaPaged } from "../utilities/kibanaAPI";
    import { KibanaDataSource } from "../utilities/kibanaPaged";
    import Modal from "../lib/Modal.svelte";
    import SideBarDetails from "../lib/SidebarDetails.svelte";


    let modal_show = false
    let modal_question="Confirma matar os jobs selecionados?"
    let sidebar_show = false
    let statusMessage = ":"; //mensagem mostrada na linha 2 da tela
    let selectedUser = getMeta("user");
    let selectedAccount = "";
    let results : KibanaPaged.Frame | null = null; //jobs históricos
    let rows: KibanaPaged.Hit[] = []; //aponta para os resultados efetivos da query kibana
    let page = 0
    let totalPages = 0;
    export let itemsPerPage = 25;
    let selection: Record<string,string>={}; //o que vai mostrado no sidebar
    let stateFilter: string; //valor usado para o select do filtro de state do histórico
    let days = 10;
    let kibana: any = null;
    let total_hits = 0;
    let localTickTack = '';
    const unsubTickTack = ticktac.subscribe((value) => localTickTack = value);
    let loading=false;

    let proxyPort = getMeta("proxyPort")
    if (!proxyPort) {proxyPort = "5173";}

    $: get_kibana(selectedUser,selectedAccount,days,itemsPerPage,stateFilter).then(result => {
        if (result) {
            rows = removeDuplicates(result.hits.hits) as  KibanaPaged.Hit[];
            page = 0;
        }
    });

    function removeDuplicates(data: any) {
        const uniqueJobs: any[] = [];
        const jobIds = new Set();

        data.forEach((item: { _source: { jobid: unknown; }; }) => {
            if (!jobIds.has(item._source.jobid)) {
                jobIds.add(item._source.jobid);
                uniqueJobs.push(item);
            }
        });

        return uniqueJobs;
    }
    const get_kibana = async (user: string | null, accounting: string, days: number | undefined, itemsPerPage: number, stateFilter: string | undefined) => {
        kibana = new KibanaDataSource(user||"",accounting,days,stateFilter, proxyPort);
        loading = true;
        const resp = await kibana.getData(itemsPerPage,page*itemsPerPage);
        loading = false;
        if (!resp || resp.hits.hits.length === 0) {
            return null;
        }
        console.log(`Total de entradas: ${kibana._hitsTotal}, total de páginas: ${Math.ceil(kibana._hitsTotal/itemsPerPage)}`);
        totalPages = Math.ceil(kibana._hitsTotal/itemsPerPage)
        total_hits = kibana._hitsTotal;
        return resp;
    };

    let timeout:any=null; //usado apenas no showMessage abaixo
    function showMessage(message:string, delay: number|null = 3000) {
        statusMessage = message + ':' + Math.random().toString(36).slice(-5);
        if (timeout) clearTimeout(timeout)
        if (delay) {
            timeout = setTimeout(()=>{
                statusMessage=':'
            },delay)
        }
    }

    onMount(() => {

        //results = await get_kibana(selectedUser,selectedAccount,days,itemsPerPage,stateFilter);
        //console.log(JSON.stringify(results));
        //rows = results.hits.hits;

        const rcvEvents = (param:any) => {
            //const message = event.data;
            //console.log(`rcvEvents: ${JSON.stringify(param.data)}`);
            //console.log(`Veio com este param: ${JSON.stringify(param.data)}`)
            let data = 'data' in param? param['data'] : param['detail']
            if ("message" in data) {
                switch (data.message) {
                    case "info":
                        //acessa direto a api do kibana...
                        //showMessage(JSON.stringify(data.payload));
                        if ("extra" in data && data.extra === "noHist") {
                            results = null;
                            rows = [];
                        }
                        break;
                    case "openLogRet":
                        if (data.retcode !== 200)
                            showMessage(data.extra,4000);
                        break;
                }
            }
        };
        window.addEventListener("message", rcvEvents);
        //dica https://stackoverflow.com/questions/73154257/how-to-properly-remove-event-listener-from-window-object
        return () => {
            console.log("Escuta de evento destruída no history");
            window.removeEventListener("message", rcvEvents);
        };
    });


    onDestroy(()=>{
        console.log('History destroyed');
        unsubTickTack;
    });

    function moreInfo(jobid:any) {
            let elem = rows.findIndex(e=>e._source.jobid === jobid)
            //console.log('o elemento ' + elem + ' retornou ' +JSON.stringify(histJobsHits[elem]));
            selection = {};
            histInfoOrder.forEach((key) => {
                if(key) {
                    const formattedVal = formatValue(key, rows[elem]._source[key] as string);
                    selection[converHistKeyName(key)] = formattedVal;
                }
            });
        sidebar_show=true;
    }

    const linkAvailable = (elem: KibanaPaged.Source) => {
        return elem.job_name.match(/\.(data|dat|xml|DATA|geo|gdt)$|((data|dat)\.[a-f0-9]{8})$/i) || elem.work_dir.match(/.*\.cmpd.*/i)
    }
    const openLog = (jobid: number) => {
        let elem = rows.findIndex(e=>e._source.jobid === jobid)
        vscode.postMessage({
            command: "openLog",
            info: "Carregar o Log de um elemento",
            payload: {
                jobid: jobid,
                chdir: rows[elem]._source.work_dir,
                name: rows[elem]._source.job_name
            },
        });
    };

    const setPage = async (p: number, inc=true) => {
        //showMessage(p)
		if (p >= 0 && p < totalPages) {
            page = inc? p: page;
            if (kibana) {
                console.log("Pedindo página " + p);
                loading = true;
                results = await kibana.getData(itemsPerPage,p*itemsPerPage);
                loading = false;
                //console.log(JSON.stringify(results));
                if (results) rows = removeDuplicates(results.hits.hits);

            }
		}
	}

    function openPortal(user:string) {
        vscode.postMessage({ command: "openUrlLink", args: user  });
    }

    function openSystemFolder(folder:string) {
        if (folder) {
            vscode.postMessage({
                command: "openSystemFolder",
                info: "Abrir pasta no windows",
                payload: {
                    chdir: folder
                }
            })
        }
    }
    function openVScodeFolder(folder:string) {
        if (folder) {
            vscode.postMessage({
                command: "openVScodeFolder",
                info: "Abrir pasta no windows",
                payload: {
                    chdir: folder
                }
            })
        }
    }

</script>

<main>
    <Modal text={modal_question} bind:show={modal_show} on:remove={() =>{}}/>
    <div class="wrapper">
        <SideBarDetails bind:show={sidebar_show} selection={selection}>
            <h4>Detalhes</h4>
        </SideBarDetails>
        <div class="first-line">
                <div id="top" class="pageTop">
                    <label for="user" class="text">Usuário:</label>
                    <input class="v_i" type="text" max="4" name="user" bind:value={selectedUser} style="width:50px">
                    <Sep w={1}/>
                    <label for="user" class="text">Account:</label>
                    <input class="v_i" type="text" max="16" name="user" bind:value={selectedAccount} style="width:150px">
                    <Sep w={1}/>
                    <span class="hint" title="Filtrar quantos dias desejados de histórico">
                        <label class="text">
                            Dias de histórico:
                        <input bind:value={days}
                            size="12"
                            placeholder="days"
                        />
                        </label>
                    </span>
                    <span class="hint" title="Filtrar pelo tipo de resultado dos jobs">
                        <select class="v_i" bind:value={stateFilter}>
                            <option value="">Todos</option>
                            <option value="COMPLETED">Completos</option>
                            <option value="CANCELLED">Cancelados</option>
                            <option value="FAILED">Falharam</option>
                            <option value="NODE_FAIL">Erro no nó</option>
                        </select>
                    </span>
                    <Sep w={2}/>
                    <button on:click={() => setPage(page-5>0?page-5:0, true)}>&laquo;</button>
                    {#if rows && rows.length > 0}
                        {#each Array(totalPages>5?5:totalPages).fill(1) as item, i}
                            {#if page+i < totalPages}
                                <button
                                    type="button"
                                    class="btn-page-number"
                                    on:click={() => setPage(page+i,false)}
                                >
                                    {page + i + 1}
                                </button>
                            {/if}
                        {/each}
                    {/if}
                    <button on:click={() => setPage(page+5>totalPages?totalPages-1:page+5, true)}>&raquo;</button>
                    <Sep w={1}/>

                    <span class="badge">{total_hits}</span>
                    {#if total_hits> 0}<span class="text">total de páginas: {totalPages}</span>{/if}
                </div>
        </div>

        <div class="second-line">
            {#if loading}Carregando...{localTickTack}<Sep w={2}/>{/if}
            {@html statusMessage.split(':')[0]}
        </div>
        <div class="third-line">
            <Toasts />
            <div class="grid2">
                <div class="grid1-header">Id</div>
                <div class="grid1-header">User</div>
                <div class="grid1-header">Account</div>
                <div class="grid1-header">Status</div>
                <div class="grid1-header">Duração</div>
                <div class="grid1-header">Data da Simulação</div>
                <div class="grid1-header">Nome (clique em um para acessar o log)</div>
                <div class="grid1-header">Abrir pasta...</div>
                {#each rows as job, index (job._source.jobid)}
                    <div class="grid1-column"><a href="/" on:click={()=>{moreInfo(job._source.jobid)}}>{job._source.jobid}</a></div>
                    <div class="grid1-column"><a href="/" on:click={()=>{openPortal(job._source.username)}}>{job._source.username}</a></div>
                    <div class="grid1-column">{job._source.account}</div>
                    <div class="grid1-column">{job._source.state}</div>
                    <div class="grid1-column">{convertSeconds2Short(job._source.elapsed)}</div>
                    <div class="grid1-column">{convertISODate2LocalTime(job._source["@submit"])}</div>
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-missing-attribute -->
                    {#if linkAvailable(job._source)}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-missing-attribute -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div class="grid1-column"><a on:click={() => openLog(job._source.jobid)}>{job._source.job_name}</a></div>
                    {:else}
                        <div class="grid1-column">{job._source.job_name}</div>
                    {/if}
                    <div class="grid1-column">
                        <!-- svelte-ignore a11y-missing-attribute -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <a on:click={() => openSystemFolder(job._source.work_dir)}>Win Explorer</a>
                        <Sep w={1}/>|<Sep w={1}/>

                        <!-- svelte-ignore a11y-missing-attribute -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <a on:click={() => openVScodeFolder(job._source.work_dir)}>VSCode</a>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</main>

<style>
    
    @import './common.css';
</style>