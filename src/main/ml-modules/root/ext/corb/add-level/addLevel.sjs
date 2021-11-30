declareUpdate();
var URI;
var COLLECTION;
let uris = URI.split(';');
const eBomLinkScope = cts.collectionQuery(COLLECTION)
const transaction = xdmp.transaction();
const txMode = xdmp.getTransactionMode();
const TRACE_ID = "xbom-process";

function getAncestors(id, result) {
    let parent = cts.values(cts.jsonPropertyReference("parent"), null, null,
        cts.andQuery([
            cts.jsonPropertyRangeQuery("child", "=", id),
            eBomLinkScope]));
    if (fn.empty(parent)) {
        return result;
    } else {
        result.push(parent);
        return getAncestors(parent, result);
    }
}
xdmp.log("tx::" + transaction + "::txMode::" + txMode + "::Processing  " + uris.length + " files");

for (const uri of uris) {
    let doc = fn.head(cts.doc(uri));
    let child = doc.root.child;
    let hasLevel = fn.empty(doc.root.xpath("./level")) ? false : true;
    let ancestors = [];
    let level = xdmp.invokeFunction(
        () => { return getAncestors(child, ancestors).length; },
        { update: "false" }
    );
    var n = new NodeBuilder();
    var node = n.addNode({"level": level}).toNode().xpath("./level");
    if (hasLevel) {
        xdmp.nodeReplace(doc.root.xpath("./level"), node);
    } else {
        xdmp.nodeInsertAfter(doc.root.xpath("./child"), node);
    }
    xdmp.trace(TRACE_ID, "tx::" + transaction + "::txMode::" + txMode + "::Uri::" + uri + "::child::" + child + "::level::" + level);
}