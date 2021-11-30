declareUpdate();
const deepBomJS = require("/lib/path/deepBOMPathGenJS.sjs");

var URI;
var COLLECTION;
var PROGRAM;

const TRACE_ID = "xbom-process";
const transaction = xdmp.transaction();
const txMode = xdmp.getTransactionMode();

const eBomLinkScope = cts.collectionQuery(COLLECTION)
xdmp.trace(TRACE_ID,URI);
let ids = URI.split(';');
xdmp.trace(TRACE_ID, "tx::" + transaction + "::txMode::" + txMode + "::Processing  " + ids.length + " nodes for PROGRAM "+ PROGRAM);

for (const id of ids) {
    const path = "/" + id + "###1" //With itemNumber=empty ; altCode=empty ; quantity=1
    const context = {
        msns: 99999,
        parent: "XXXXXX",
        pn: id,
        type: "CA",
        altCode: "struct",
        level: 0,
        caLevel: 0,
        quantity: 1,
        quantityLink: 1,
        quantityUnit: "EA",
        path:path,
        hash: xdmp.hash64(path),
        altPath: "",
        altPathPad: "",
        altPathLevel: "",
        currentPathGroup: 0,
        uri: "/ebom/",
        caPath: path,
        dsPath: "",
        ca: "",
        ds: ""
    };
    deepBomJS.generatePathForRoot(context, PROGRAM);
}

