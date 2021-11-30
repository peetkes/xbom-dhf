const PREFIX_PADDING_ALTCODE = "-"
const PREFIX_PADDING_PN = "-"
const TRACE_ID_1 = "xbom-1";
const TRACE_ID_2 = "xbom-2";
const TRACE_ID_3 = "xbom-3";
const TRACE_ID_LOG = "xbom-log";
const TRACE_ID_4 = "xbom-linkuri";
const TRACE_ID_QUEUE = "xbom-queue";

class Queue {
  constructor(...elements) {
    // Initializing the queue with given arguments
    this.elements = [...elements];
  }
  // Proxying the push/shift methods
  push(...args) {
    return this.elements.push(...args);
  }
  shift(...args) {
    return this.elements.shift(...args);
  }
  // Add some length utility methods
  get length() {
    return this.elements.length;
  }
  set length(length) {
    return this.elements.length = length;
  }
}
const cache = new Queue();

function init(id, program, type, cacheSize) {
  xdmp.trace(TRACE_ID_LOG, "init::" + xdmp.transaction() + "::" + xdmp.getTransactionMode()+"::"+cache.length);
  const rootContent = pathContentRoot(id,program);
  const linkUri = "/xxxx/"+program+"_"+rootContent.parent+"_"+rootContent.pn+".json";
  processChildren(rootContent, linkUri, type, 0, cacheSize);
  saveAndFlush();
}

function processChildren(rootContent, linkUri, type, level, cacheSize) {
  const childrenUri = getChildUris(linkUri, type);
  for (let childUri of childrenUri) {
    traverseLinks(rootContent, childUri, type, level, cacheSize);
  }
}

function traverseLinks(pathContent, linkUri, type, level, cacheSize) {
  xdmp.trace(TRACE_ID_1, "traverseLinks::"+linkUri+"::"+type+"::"+level+"::"+cache.length);
  // flush the cache if it is full
  if (cache.length == cacheSize) {
    saveAndFlush();
  }
  let generatePathArray = generatePathContent(pathContent, linkUri);
  currentPathContent = generatePathArray[0];
  // si loop detected or empty msns during generatePath, stop the recursivity for this level
  if (generatePathArray[1]) {
    xdmp.trace(TRACE_ID_2, "Loop detected voor "+linkUri);
    return;
  }
  let uri = currentPathContent.path + ".json";
  cache.push({
    uri: currentPathContent.path + ".json",
    content: currentPathContent
  });
//    if (pathCurrent.pn.length == 18 && pathCurrent.quantity>1 )
  xdmp.trace(TRACE_ID_1, "path qty: "+currentPathContent.path+", qty:"+currentPathContent.quantity+"\n");
  level++;
  return processChildren(currentPathContent, linkUri, type, level, cacheSize);
}

function saveAndFlush() {
  xdmp.invokeFunction(
      () => {
        xdmp.trace(TRACE_ID_QUEUE, "saveAndFlush::" + xdmp.transaction() + "::" + xdmp.getTransactionMode()+"::"+cache.length);
        while (cache.length) {
          item = cache.shift();
          xdmp.documentInsert(item.uri, item.content, {
            permissions: xdmp.defaultPermissions(),
            collections: 'eBomLink/path'
          });
        }
      },{
          update: 'true'
      }
  );
};

const intersection = (arr1, arr2) => {
  const set = new Set(arr2);
  const intersection = new Set(arr1.filter(elem => set.has(elem)));
  return Array.from(intersection);
};

function pathContentRoot(part, program) {
  let tmpPath = {};
  tmpPath.parent = "XXXXX";
  tmpPath.pn = part;
  tmpPath.altPathPad = "";
  tmpPath.altPathLevel = "";
  tmpPath.path = "/"+part+"###1";
  tmpPath.ca = "";
  tmpPath.caPath = "/"+part+"###1";
  tmpPath.caLevel = 0;
  tmpPath.ds = "";
  tmpPath.dsPath = "";
  tmpPath.dsLevel = "";
  tmpPath.level = 0;
  tmpPath.quantity = 1;
  tmpPath.quantityUnit = "EA";
  tmpPath.msns = cts.values(
    cts.jsonPropertyReference("msns"),
    null,
    null,
    cts.andQuery([
      cts.collectionQuery(["eBomLink","upperLink","caLink"]),
      cts.jsonPropertyValueQuery("program",program),
      cts.jsonPropertyValueQuery("parent",part)
    ])).toArray().map( x=> Number(x));
  return tmpPath;
}

/*
 * This function returns an array with 2 parts, first part will hold the generated pathContent, second part contains a stop flag.
 * If the stop flog is set to true the recursion should stop
 */
function generatePathContent(path, linkUri) {
  let stop = false;
  const newPathContent = {}
  const linkDoc = fn.doc(linkUri).toArray()[0].toObject();
  xdmp.trace(TRACE_ID_4, "reading uri: "+linkUri+"\n");

  // check if a loop
  stop = (fn.contains(path.path, linkDoc.child+'#'))? true : stop;
  if (stop) {
    xdmp.trace(TRACE_ID_3, "path stop loop: path:" + path.path + " ,child:" + linkDoc.child);
    return [newPathContent, stop];
  }
  if (typeof(linkDoc.msns) != "object")
    linkDoc.msns = [linkDoc.msns] //bug ds msns qd un seul avion pas un array
  linkDocMsnsLen= linkDoc.msns.length;
  pathMsnsLen = path.msns.length;
  var start = xdmp.elapsedTime();
  newPathContent.msns = intersection(path.msns, linkDoc.msns)
//  newPath.msns = path.msns.filter(value => linkDoc.msns.includes(value));
  var end = xdmp.elapsedTime();
  xdmp.trace(TRACE_ID_1, "linkdoc msns len=" + linkDoc.msns.length + " path msns len=" + path.msns.length + " result len=" + newPathContent.msns.length + " took " + end.subtract(start));
  // check if no more effectivities, stop recursity at this level
  stop = (newPathContent.msns.length == 0)? true :  stop;
  if (stop) {
    xdmp.trace(TRACE_ID_2, "path stop, msns empty: path:" + path.path + " ,child:" + linkDoc.child);
    return [newPathContent, stop];
  }

  newPathContent.pn = linkDoc.child;
  newPathContent.hash = xdmp.hash64(linkDoc.child)
  newPathContent.issue = linkDoc.childIssue;
  newPathContent.type = linkDoc.childType;
  newPathContent.program = linkDoc.program;
  newPathContent.parent = linkDoc.parent;
  newPathContent.parentHash = xdmp.hash64(linkDoc.parent)

  let itemNumber = (linkDoc.itemNumber) ? linkDoc.itemNumber+"" : "";
  let altCode = (linkDoc.altCode) ? linkDoc.altCode+"" : "";
  let quantity = (linkDoc.quantity) ? linkDoc.quantity+"" : "";

  let addToPath = "/" + linkDoc.child + "#" + itemNumber + "#" + altCode + "#" + quantity;
  if (linkDoc.childType == "CA" || linkDoc.childType == "ADAPCI") {
    newPathContent.ca = (linkDoc.childType == "ADAPCI" ) ? linkDoc.parent : ""
    newPathContent.caPath = path.caPath + addToPath;
    newPathContent.caLevel = path.caLevel + 1;
    newPathContent.ds = "";
    newPathContent.dsPath = "";
    newPathContent.dsLevel = "";
  } else {
    newPathContent.ca =  path.ca;
    newPathContent.caPath = path.caPath;
    newPathContent.caLevel = path.caLevel;
    if (linkDoc.childType == "ADAPDS" ) {
      newPathContent.ds = linkDoc.child;
      newPathContent.dsPath = addToPath;
      newPathContent.dsLevel = 0;
    }
    else {
      newPathContent.ds = path.ds;
      newPathContent.dsPath = path.dsPath + addToPath;
      newPathContent.dsLevel = path.dsLevel + 1;
    }
  }
  newPathContent.path = path.path + addToPath;
  newPathContent.level = path.level + 1;

  if (altCode) {
    newPathContent.altPathPad =  path.altPathPad + "/" + linkDoc.child.padStart(30, PREFIX_PADDING_PN) + "#" + altCode.padStart(3, PREFIX_PADDING_ALTCODE)
    newPathContent.altPathLevel = (path.altPathLevel ) ? path.altPathLevel + 1 : 0;
  }
  else {
    newPathContent.altPathPad = path.altPathPad;
    newPathContent.altPathLevel = path.altPathLevel
  }

  if (path.quantityUnit === "EA") {
    newPathContent.quantityUnit = linkDoc.quantityUnit;
    newPathContent.quantity = path.quantity * linkDoc.quantity;
  }
  else if (path.quantityUnit === "AS_NEEDED"){
    newPathContent.quantityUnit = "AS_NEEDED";
    newPathContent.quantity = 1;
  }
  else {
    newPathContent.quantityUnit = "ERROR";
    newPathContent.quantity = 1;
  }
  newPathContent.quantityLink = linkDoc.quantity;
  newPathContent.linkType = linkDoc.linkType;
  newPathContent.quantityUnitLink = linkDoc.quantityUnit;
  newPathContent.itemNumber = itemNumber;
  newPathContent.altCode = altCode;

  return [newPathContent, stop];
}

function getChildUris(linkUri, type) {
  linkUri = linkUri.toString()
  const split = linkUri.split((/(?:_|\/|\.)+/))
  const linkChild = split[4];
  const program = split[2];
  
  if (type == "ca") query = cts.andQuery([
    cts.collectionQuery(["caLink","upperLink"]),
    cts.jsonPropertyValueQuery("program", program),
    cts.jsonPropertyRangeQuery("parent", "=", linkChild )
  ]);
  if (type == "up") query = cts.andQuery([
    cts.collectionQuery(["upperLink"]),
    cts.jsonPropertyValueQuery("program", program),
    cts.jsonPropertyRangeQuery("parent", "=", linkChild )
  ]);
  if (type == "structure") query = cts.andQuery([
    cts.collectionQuery(["eBomLink"]),
    cts.jsonPropertyValueQuery("program", program),
    cts.jsonPropertyRangeQuery("parent", "=", linkChild ),
    cts.notQuery(cts.jsonPropertyValueQuery("childType", "CADNODE")),
    cts.notQuery(cts.jsonPropertyValueQuery("linkType", "EQ"))
  ]);
  if (type == "equipment") query = cts.andQuery([
    cts.collectionQuery(["eBomLink"]),
    cts.jsonPropertyValueQuery("program", program),
    cts.jsonPropertyRangeQuery("parent", "=", linkChild )
  ]);
  return cts.uris(null, null, query);
}


module.exports = {
  init,
  pathContentRoot,
  traverseLinks,
  getChildUris
}
