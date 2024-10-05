export function getMeta(metaName: string) {
    const metas = document.getElementsByTagName("meta");
    for (let i = 0; i < metas.length; i++) {
        if (metas[i].getAttribute("name") === metaName) {
            return metas[i].getAttribute("content");
        }
    }
    return "";
}