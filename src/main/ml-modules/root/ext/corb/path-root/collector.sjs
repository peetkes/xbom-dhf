// limit the search to all the CA
var COLLECTION;
var PROGRAM;

const TRACE_ID = "xbom-collector";

let eBomLinkScope = cts.collectionQuery(COLLECTION)

let sparqlQuery = `
    SELECT DISTINCT ?parent  WHERE {
    ?parent <http://airbus.com/xbom#isParentOf> ?child.
    FILTER NOT EXISTS {?gparent <http://airbus.com/xbom#isParentOf> ?parent }
    }`;

//search for the all the parent who do not have parent themselves
let allRoots =  sem.sparql(sparqlQuery, null, ["map"], eBomLinkScope).toArray().map(item => item.parent)
let nrOfRoots = allRoots.length;
xdmp.trace(TRACE_ID, "Found " + nrOfRoots + " root nodes");
fn.insertBefore(
    fn.insertBefore(
        fn.insertBefore(Sequence.from(allRoots), 0, nrOfRoots),
        0, "PROCESS-MODULE.COLLECTION="+COLLECTION
    ),
    0, "PROCESS-MODULE.PROGRAM="+PROGRAM
);
