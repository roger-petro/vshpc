<script lang="ts">
    import { vscode } from '../utilities/vscode';
    import { onMount, onDestroy } from 'svelte';
    import Toasts from '../lib/Toasts.svelte';
    import { addToast, clearToasts } from '../lib/ToastStore';
    import Sep from '../lib/Separator.svelte';
    import {
        convertISODate2LocalTime,
        formatValue,
        convertJobKeyName,
        getMeta,
        converSlurmTime2Short,
        jobInfoOrder,
    } from '../utilities/utils';
    import { accounts } from '../utilities/accounts';
    import Modal from '../lib/Modal.svelte';
    import SideBarDetails from '../lib/SidebarDetails.svelte';
    import { ticktac } from '../utilities/clockStore';
    import Tooltip from '../lib/CustomToolTip.svelte';
    import Pizza from '../lib/Pizza.svelte';
    import type { Job } from '../utilities/row';

    let modal_show = false;
    let modal_question = 'Confirma matar os jobs selecionados?';
    let sidebar_show = false;
    let statusMessage = ':'; //mensagem mostrada na linha 2 da tela
    let selectedUser = '';
    let selectedAccount = '';
    let rows: Job.Row[] = [];
    let progress: Record<string, string> = {};
    let selectedRows: boolean[] = Array(rows.length).fill(false);
    let page = 0;
    let pages: Job.Row[][] = [];
    let currentPageRows: Job.Row[] = [];
    export let itemsPerPage = 25;
    let selection: Record<string, string> = {}; //o que vai mostrado no sidebar
    let localTickTack = '';
    const unsubTickTack = ticktac.subscribe(value => (localTickTack = value));
    let loading = false;

    let sameDate = true;
    let interval: NodeJS.Timeout | null = null;
    let nonRecurre = false;

    const autoRefreshInterval = 30000;

    let proxyPort = getMeta('proxyPort');
    if (proxyPort === '') {
        proxyPort = '5173';
    }

    $: listJobs(selectedUser, selectedAccount, itemsPerPage);

    $: if (selectedRows) {
        let selectedJobids: string[] = [];
        selectedRows.forEach((e, i) => {
            if (e === true && rows[i].user === getMeta('user')) {
                selectedJobids.push(rows[i].id);
            }
            //selectedRows[i]=false
        });
        console.log(
            'Jobsids até então selecionados para morrer: ' + JSON.stringify(selectedJobids),
        );
    }

    let timeout: NodeJS.Timeout | null = null; //usado apenas no showMessage abaixo
    function showMessage(message: string, delay: number | null = 3000) {
        statusMessage = message + ':' + Math.random().toString(36).slice(-5);
        if (timeout) clearTimeout(timeout);
        if (delay) {
            timeout = setTimeout(() => {
                statusMessage = ':';
            }, delay);
        }
    }

    //paginaçao baseada em
    //https://svelte.dev/repl/1cb6b4324bc848a28ff6159299518f90?version=3.35.0
    const paginate = (items: Job.Row[]) => {
        const totalPages = Math.ceil(items.length / itemsPerPage);

        const paginatedItems = Array.from({ length: totalPages }, (_, index) => {
            const start = index * itemsPerPage;
            return items.slice(start, start + itemsPerPage);
        });
        //console.log("paginatedItems are", paginatedItems);
        pages = [...paginatedItems];
        currentPageRows = pages.length > 0 ? pages[0] : [];
        console.log('Tamanho da página calculado:' + pages.length);
        page = 0;
    };

    onMount(() => {
        showMessage('A busca é automática e realizada conforme o filtro');
        clearToasts();
        const rcvEvents = (param: { [x: string]: any }) => {
            let data = 'data' in param ? param['data'] : param['detail'];
            if (data && 'message' in data) {
                switch (data.message) {
                    case 'jobs': //retorno do getJobs intermediado pelo jobsPanel
                        //console.log(`Comando selecionado: ${data.jobs}`);
                        rows = data.payload;
                        selectedRows = Array(rows.length).fill(false);
                        paginate(rows);
                        loading = false;
                        nonRecurre = false;
                        updateRunningJobs();
                        getProgress();
                        refresh();
                        break;
                    case 'updateJobs':
                        //console.log(data.payload)
                        if (currentPageRows.length > 0) {
                            for (const ret of data.payload) {
                                const idx = currentPageRows.findIndex(e => e.id === ret['id']);
                                if (idx >= 0) {
                                    currentPageRows[idx]['state'] = ret['state'];
                                    currentPageRows[idx]['age'] = ret['age'];
                                }
                            }
                            //tira fora de rows os elementos que não existem mais no cluster
                            //currentPageRows = currentPageRows.filter(elemA => !data.payload.some(elemB => elemB.id === elemA.id));
                        }

                        break;
                    case 'info':
                        if ('extra' in data && data.extra === 'noJobs') {
                            console.log('Não retornou dados');
                            progress = {};
                            loading = false;
                            nonRecurre = false;
                            rows = [];
                            selectedRows = Array(rows.length).fill(false);
                            paginate(rows);
                            showMessage('Não retornou jobs com o filtro atual', 6000);
                            //addToast({ message:"Nenhum JOB em curso para este filtro", type:"info",
                            //    dismissible:true, timeout:3000 })
                        }
                        break;
                    case 'openLogRet':
                        if (data.retcode !== 200) showMessage(data.extra, 4000);
                        break;
                    case 'cmgprogress':
                        nonRecurre = false;
                        if (data.payload.length > 0) {
                            showMessage('', 1000);
                            console.log('Chegou progress começando em:',data.payload[0])
                            for (const job of data.payload) {
                                progress[job['jobid']] =
                                    job['progress'] >= 0
                                        ? (job['progress'] * 100).toFixed(2)
                                        : '101';
                            }
                            progress = progress;
                        }
                }
            }
        };
        window.addEventListener('message', rcvEvents);
        //dica https://stackoverflow.com/questions/73154257/how-to-properly-remove-event-listener-from-window-object
        return () => {
            console.log('Escuta de evento destruída no jobs');
            window.removeEventListener('message', rcvEvents);
        };
    });

    onDestroy(() => {
        console.log('Jobs2 destroyed');
        unsubTickTack;
        if (interval) clearInterval(interval);
    });

    /**
     * Solicita ao vscode os jobs via notificação
     */
    function listJobs(user: string, account: string, pagesize: number) {
        console.log('Novo tamanho de página ' + pagesize);
        loading = false;
        nonRecurre = false;
        let userOk = false;
        let accountOk = true;

        if (user.length === 4 || user.length === 0) userOk = true;

        if (account !== '') {
            accountOk = false;
            //@TODO: ler os accounts do mongodb
            if (accounts.findIndex(val => val === account) > -1) {
                accountOk = true;
            }
        }

        console.log(
            `Tipo de pesquisa para: ${user}, com userOk:${userOk} e ${account}, com ${accountOk}`,
        );

        if (userOk && accountOk) {
            loading = true;
            nonRecurre = false;
            //progress={}
            vscode.postMessage({
                command: 'listJobs',
                info: 'Solicitação dos jobs correntes enviada para o painel',
                payload: { user: user, userOk: userOk, accountOk: accountOk, account: account },
            });
            console.log('Mensagem listJobs enviada!');
        }
    }

    function killSelecteds() {
        showMessage('Comando para matar os jobs enviados, em breve a tela será atualizada');
        let selectedJobids: string[] = [];
        selectedRows.forEach((e, i) => {
            if (e === true && rows[i].user === getMeta('user')) {
                selectedJobids.push(rows[i].id);
            }
            if (selectedJobids.length > 0) {
                vscode.postMessage({
                    command: 'killJobs',
                    info: 'Matar jobs',
                    payload: selectedJobids,
                });
            }
            selectedRows[i] = false;
        });
        showMessage('Os seguintes jobids serão removidos ' + JSON.stringify(selectedJobids));
    }

    function moreInfo(jobid: string) {
        let elem = rows.findIndex(e => e.id === jobid);
        sidebar_show = false;
        selection = {};
        jobInfoOrder.forEach(key => {
            if (key) {
                const formattedVal = formatValue(key, rows[elem][key] as string);
                selection[convertJobKeyName(key)] = formattedVal;
            }
        });
        sidebar_show = true;
    }
    const openLog = (jobid: string) => {
        showMessage('Procurando o arquivo...leva um tempo', 3000);
        let elem = rows[rows.findIndex(e => e.id === jobid)];
        vscode.postMessage({
            command: 'openLog',
            info: 'Carregar o Log de um elemento',
            payload: {
                jobid: jobid,
                chdir: elem.work_dir,
                name: elem.name,
                qos: elem.qos,
            },
        });
    };

    const setPage = (p: number, inc = true) => {
        console.log('Pagina ' + p);
        if (p >= 0 && p < pages.length) {
            page = p;
            currentPageRows = pages.length > 0 ? pages[page] : [];
            if (currentPageRows.length > 0 && !(currentPageRows[0].id in progress)) {
                updateRunningJobs();
                getProgress();
                refresh();
            }
        }
    };

    function openPortal(user: string) {
        vscode.postMessage({ command: 'openUrlLink', args: user });
    }

    function openGitServer(job: Job.Row) {
        vscode.postMessage({ command: 'openGitServer', payload: job });
    }

    function openSystemFolder(folder: string) {
        if (folder) {
            vscode.postMessage({
                command: 'openSystemFolder',
                info: 'Abrir pasta no windows',
                payload: {
                    chdir: folder,
                },
            });
        }
    }
    function openVScodeFolder(folder: string) {
        if (folder) {
            vscode.postMessage({
                command: 'openVScodeFolder',
                info: 'Abrir pasta no windows',
                payload: {
                    chdir: folder,
                },
            });
        }
    }

    function getProgress() {
        if (rows.length > 0 && nonRecurre === false) {
            let jobs = currentPageRows
                .filter(e => e.state === 'RUNNING')
                .map(e => e.id)
                .join(',');
            if (jobs && jobs.length > 0) {
                nonRecurre = true;
                vscode.postMessage({
                    command: 'cmgprogress',
                    payload: { jobs: jobs, sameDate: sameDate },
                });
            } else {
                showMessage('Nenhum job em execução');
            }
        }
    }

    function updateRunningJobs() {
        let jobs = currentPageRows.map(e => e.id).join(',');
        vscode.postMessage({
            command: 'updateJobs',
            info: 'Solicitação de atualização dos jobs apresentados no painel',
            payload: { user: selectedUser, jobs },
        });
    }

    function refresh(checked = true) {
        //listJobs(selectedUser,selectedAccount,itemsPerPage)
        if (interval) clearInterval(interval);
        if (checked) {
            console.log('setInterval armado');
            interval = setInterval(() => {
                updateRunningJobs();
                getProgress();
            }, autoRefreshInterval);
        } else {
            interval = null;
            console.log('setInterval desarmado');
        }
    }

    function shortName(str: string, maxLength = 70) {
        if (str.length <= maxLength) {
            return str;
        } else if (str.length <= maxLength + 3) {
            // Número de pontos é o excesso de comprimento
            const numDots = str.length - maxLength;
            const start = str.substring(0, maxLength - numDots);
            const dots = '.'.repeat(numDots);
            return `${start}${dots}`;
        }

        // Para strings que excedem maxLength por mais de 3 caracteres, usar a abordagem original com três pontos
        const partSize = Math.floor((maxLength - 3) / 2);
        const start = str.substring(0, partSize);
        const end = str.substring(str.length - partSize);
        return `${start}...${end}`;
    }

    function getCommitHash(job: Job.Row) {
        if ('comment' in job) {
            const parts = job.comment?.split('|') || [];
            if (parts?.length >= 4) {
                return parts[3].substring(0, 8);
            }
        }
        return '';
    }
</script>

<main>
    <Modal text={modal_question} bind:show={modal_show} on:remove={() => killSelecteds()} />
    <div class="wrapper">
        <SideBarDetails bind:show={sidebar_show} {selection}>
            <h4>Detalhes</h4>
        </SideBarDetails>
        <div class="first-line">
            <div id="top" class="pageTop">
                <label for="user" class="text">Usuário:</label>
                <input
                    placeholder={getMeta('user')}
                    class="v_i"
                    type="text"
                    max="4"
                    name="user"
                    bind:value={selectedUser}
                    style="width:50px"
                />
                <Sep w={1} />
                <label for="user" class="text">Account:</label>
                <input
                    class="v_i"
                    type="text"
                    max="16"
                    name="user"
                    bind:value={selectedAccount}
                    style="width:150px"
                />
                <Sep w={1} />
                <button
                    class="button green"
                    on:click={() => listJobs(selectedUser, selectedAccount, itemsPerPage)}
                    >Recarregar</button
                >
                <Sep w={2} />

                {#if rows.length > 0}
                    {#if selectedRows.findIndex(e => e === true) === -1}
                        <button
                            class="button_sized_1"
                            on:click={() => {
                                selectedRows.forEach((e, i) => {
                                    if (rows[i].user === getMeta('user')) {
                                        selectedRows[i] = true;
                                    }
                                });
                            }}>Selecionar Todos</button
                        >
                    {:else}
                        <button
                            class="button_sized_1"
                            on:click={() => {
                                selectedRows.forEach((e, i) => (selectedRows[i] = false));
                            }}>Desmarcar</button
                        >
                    {/if}
                    <button
                        disabled={selectedRows.findIndex(e => e === true) === -1}
                        on:click={() => {
                            modal_show = true;
                        }}>Matar</button
                    >

                    <button
                        disabled={page === 0}
                        on:click={() => setPage(page - 5 > 0 ? page - 5 : 0, true)}>&laquo;</button
                    >
                    {#each Array(pages.length > 5 ? 5 : pages.length).fill(1) as item, i}
                        {#if page + i < pages.length}
                            <button
                                type="button"
                                class="btn-page-number"
                                on:click={() => setPage(page + i, false)}
                            >
                                {page + i + 1}
                            </button>
                        {/if}
                    {/each}
                    <button
                        disabled={page === pages.length - 1}
                        on:click={() =>
                            setPage(page + 5 > pages.length ? pages.length - 1 : page + 5, true)}
                        >&raquo;</button
                    >
                {/if}
                <Sep w={1} />

                <span class="badge">{rows.length}</span>
                {#if rows.length > 0}<span class="text">Total de páginas: {pages.length}</span>{/if}
                <Sep w={2} />

                <Tooltip
                    text="Selecione para ler o progresso dos modelos usando a mesma data de fim da simulação (mais rápido)"
                    ><span class="text"
                        >Datas iguais: <input type="checkbox" bind:checked={sameDate} /></span
                    ></Tooltip
                >
            </div>
        </div>

        <div class="second-line">
            {@html statusMessage.split(':')[0]}<Sep
                w={2}
            />{#if loading}Carregando...{localTickTack}<Sep w={2} />{/if}
        </div>
        <div class="third-line">
            <Toasts />
            <div class="grid1">
                <div class="grid1-header">Sel.</div>
                <div class="grid1-header">Id</div>
                <div class="grid1-header">User</div>
                <div class="grid1-header">Status</div>
                <div class="grid1-header">Account</div>
                <div class="grid1-header">
                    <Tooltip text="clique para atualizar o progresso (apenas CMG)"
                        ><button on:click={getProgress}>Progresso</button></Tooltip
                    >
                </div>
                <div class="grid1-header">Age</div>
                <div class="grid1-header">Start</div>
                <div class="grid1-header">Nome (clique em um para acessar o log)</div>
                <div class="grid1-header">Commit</div>
                <div class="grid1-header">Abrir pasta...</div>

                {#each currentPageRows as job, index (job.id)}
                    <div class="grid1-column">
                        <input
                            type="checkbox"
                            disabled={job.user !== getMeta('user')}
                            bind:checked={selectedRows[rows.findIndex(e => e.id === job.id)]}
                        />
                    </div>
                    <div class="grid1-column">
                        <a
                            href="/"
                            on:click={() => {
                                moreInfo(job.id);
                            }}>{job.id}</a
                        >
                    </div>
                    <div class="grid1-column">
                        <a
                            href="/"
                            on:click={() => {
                                openPortal(job.user);
                            }}>{job.user}</a
                        >
                    </div>
                    <div class="grid1-column">{job.state.split(' ')[0]}</div>
                    <div class="grid1-column">{job.account}</div>
                    <div class="grid1-column">
                        <div class="progress-cell">
                            <div
                                class="progress-bar"
                                style="width: {job.id in progress
                                    ? Number(progress[job.id]) >= 0 &&
                                      Number(progress[job.id]) <= 100
                                        ? progress[job.id]
                                        : 0
                                    : 0}%;"
                            >
                                <span class="progress-text"
                                    >{job.id in progress
                                        ? Number(progress[job.id]) >= 0 &&
                                          Number(progress[job.id]) <= 100
                                            ? progress[job.id] + '%'
                                            : 'ERR'
                                        : 'trying..'}</span
                                >
                            </div>
                        </div>
                    </div>
                    <div class="grid1-column">{converSlurmTime2Short(job.age)}</div>
                    <div class="grid1-column">{convertISODate2LocalTime(job.startTime, '')}</div>

                    <!-- coloque as extensões com as quais sei abrir log -->
                    {#if job.name.match(/\.(data|dat)$|((data|dat)\.[a-f0-9]{8})$/i) || job.work_dir.match(/.*\.cmpd.*/i)}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-missing-attribute -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div class="grid1-column">
                            <a on:click={() => openLog(job.id)}>{shortName(job.name)}</a>
                        </div>
                    {:else}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-missing-attribute -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div class="grid1-column">
                            <a on:click={() => openLog(job.id)}>{shortName(job.name)}</a>
                        </div>
                        <!--div class="grid1-column">{job.name}</div-->
                    {/if}
                    {#if getCommitHash(job)}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-missing-attribute -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div class="grid1-column">
                            <a on:click={() => openGitServer(job)}>{getCommitHash(job)}</a>
                        </div>
                    {:else}
                        <div class="grid1-column">n/a</div>
                    {/if}
                    <div class="grid1-column">
                        <!-- svelte-ignore a11y-missing-attribute -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <a on:click={() => openSystemFolder(job.work_dir)}>Win Explorer</a>
                        <Sep w={1} />|<Sep w={1} />

                        <!-- svelte-ignore a11y-missing-attribute -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <a on:click={() => openVScodeFolder(job.work_dir)}>VSCode</a>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</main>

<style>
    @import './common.css';

    /* Estilo da célula que conterá a barra de progresso */
    .progress-cell {
        position: relative;
        margin-left: 0;
        padding-left: 0;
        width: 100%;
        height: 20px; /* Defina uma altura para a barra de progresso */
        display: flex;
        align-items: center; /* Centraliza o texto verticalmente */
        justify-content: center; /* Centraliza o texto horizontalmente */
    }

    /* Estilo da barra de progresso */
    .progress-bar {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background-color: rgba(255, 255, 0, 0.2); /* Amarelo com 50% de transparência */
        width: 0%; /* A largura será controlada pelo Svelte */
        z-index: 1; /* Garante que a barra esteja sob o texto */
    }

    /* Texto de progresso */
    .progress-text {
        position: relative;
        z-index: 2; /* Garante que o texto fique sobre a barra */
    }
</style>
