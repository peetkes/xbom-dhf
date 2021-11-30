declareUpdate();
const deepBomJS = require("/lib/path/deepBOMPathGenJS.sjs");

var URI;
var COLLECTION;
var LEVEL;

const TRACE_ID = "xbom-process";
const transaction = xdmp.transaction();
const txMode = xdmp.getTransactionMode();
const pathCollection = "eBomLink/path"
xdmp.trace(TRACE_ID, "COLLECTION=" + COLLECTION);
xdmp.trace(TRACE_ID, "LEVEL=" + LEVEL);

xdmp.trace(TRACE_ID,URI);
let ids = URI.split(';');
xdmp.trace(TRACE_ID, "tx::" + transaction + "::txMode::" + txMode + "::Processing  " + ids.length + " nodes for level "+ LEVEL);

for (const id of ids) {
    let parentId = id.split('/')[0];
    let child = id.split('/')[1];
    let parentContext = fn.head(xdmp.invokeFunction(
        () => {
            return fn.head(cts.search(
                cts.andQuery([
                    cts.collectionQuery(pathCollection),
                    cts.jsonPropertyValueQuery("pn", parentId)
                ]),["unfiltered"])).toObject()
        },
        { update: "false" }
    ));
    deepBomJS.generatePath(parentContext, child, COLLECTION);
}
