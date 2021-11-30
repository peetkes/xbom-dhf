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
    let parentIds = cts.values(cts.jsonPropertyReference("parent"),null,[],cts.andQuery([
        cts.collectionQuery(COLLECTION),
        cts.jsonPropertyRangeQuery("child","=", id),
        cts.jsonPropertyValueQuery("level", xs.integer(LEVEL))
    ]));
    xdmp.trace(TRACE_ID, "processing " + parentIds.toArray().length + " parents for childId " + id);
    for (const parentId of parentIds) {
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

        deepBomJS.generatePath(parentContext, id, COLLECTION);
    }
}

