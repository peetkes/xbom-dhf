'use strict';
var COLLECTION;
const TRACE_ID = "xbom-collector";
const LEVEL = 1;

let uris = cts.uris(null, null, cts.collectionQuery(COLLECTION));
let nrOfDocs = fn.count(uris);
xdmp.trace(TRACE_ID, "Found " + nrOfDocs + " documents");
fn.insertBefore(fn.insertBefore(fn.insertBefore(uris, 0, nrOfDocs), 0, "PROCESS-MODULE.COLLECTION="+COLLECTION), 0, "PROCESS-MODULE.LEVEL="+LEVEL);

//let children = cts.values(cts.jsonPropertyReference("child"), null, null, cts.collectionQuery(COLLECTION));
//fn.insertBefore(children,0,fn.count(children));
