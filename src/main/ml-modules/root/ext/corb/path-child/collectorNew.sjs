var COLLECTION;
var LEVEL;
const TRACE_ID = "xbom-collector";

let eBomLinkScope = cts.collectionQuery(COLLECTION)
let sparqlQuery = `
    PREFIX xbom: <http://airbus.com/xbom#>
    select ?parent ?child
    where {
        ?parent <http://airbus.com/xbom#isParentOf> ?child .
        ?child xbom:level ?level .
    }`;

//search for all children at the given level
let allEBomLinks =  sem.sparql(sparqlQuery, {"level": xs.integer(LEVEL)}, ["map"], eBomLinkScope)
    .toArray()
    .map(item => { return fn.concat(item.parent,'/',item.child); });
let nrOfLinks = allEBomLinks.length;
xdmp.trace(TRACE_ID, "Found " + nrOfLinks + " link nodes");
fn.insertBefore(
    fn.insertBefore(
        fn.insertBefore(Sequence.from(allEBomLinks), 0, nrOfLinks),
        0,
        "PROCESS-MODULE.COLLECTION="+COLLECTION
    ),
    0,
    "PROCESS-MODULE.LEVEL="+LEVEL
);

