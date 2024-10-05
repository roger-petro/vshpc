import { dummyJobs } from "./dummy";

/**
 * Chamado pelo vscode.ts quando ele se
 * da conta que está rodando no browser puramente.
 * @param message 
 */

export async function mockPostMessage(message) {

    const command = message.command;
    const payload = message.payload;
    switch (command) {
        case "listJobs":
            console.log("List jobs chegou no mockOnDidReceiver");
            // Code that should run in response to the hello message command
            //window.showInformationMessage(info);
            //this.sendMessage2View({'message':'jobs','jobs': dummyJobs});
            _askForJobs(payload);
            break;
    }

    async function _askForJobs(payload) {
        console.log(JSON.stringify(payload));
        let ret = dummyJobs; //await getJobs(this.settings,payload);
        if (ret.length > 0) {
            console.log("Despachando os jobs de teste");
            setTimeout(()=>{
                window.dispatchEvent(new CustomEvent('message', {
                    bubbles: true,
                    detail: {'message':'jobs', 'payload': ret}
                }));
            },1000);


        } else {
            setTimeout(()=>{
                console.log("Retornado evento para webview informando não ter chegado jobs válidos");
                window.dispatchEvent(new CustomEvent('message', {
                    bubbles: false,
                    detail: {'message': 'info', 'payload': 'Nenhum job encontrado!', extra:'noJobs'}
                }));
            },1000);

        }
    }
}