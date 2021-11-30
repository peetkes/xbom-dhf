const permissions = require("/lib/permissions.sjs");
const sem = require("/MarkLogic/semantics.xqy");
const TRACE_ID = "xbom-process";

const PREFIX_URI_CHILDTYPE = {
    "STDPT": "/standard/",
    "DASSY": "/part/",
    "ADAPDS": "/part/",
    "DDPT": "/part/",
    "CA": "/ca/XWB_",
    "CI": "/ci/",
    "FINCI": "/equipment/",
    "FINDS": "/equipment/",
    "PNFIN": "/equipment/",
    "CMS": "/equipment/",
    "ADAPCI": "/ci/"
}

const PREFIX_PADDING_ALTCODE = "-"
const PREFIX_PADDING_PN = "-"

Sequence.prototype.xpath = function (x) {
    return xdmp.xqueryEval('declare variable $d external; $d' + x, {d: this})
}

function getRootEffectivity(pn) {
    // retreive the list of distinct msn for a specific pn
    return xdmp.invokeFunction(
        () => {
            return cts.values(cts.jsonPropertyReference("msns",["type=int"]), null, ["concurrent"],
                cts.andQuery([
                    cts.collectionQuery(["eBomLink", "caLink", "upperLink"]),
                    cts.jsonPropertyRangeQuery("parent", "=", pn)
                ])
            ).toArray()
        },
        { update: "false" }
    )
}

function getLinksCache(context, msns, levelToManage) {
    /*
        get all the triples with the predicate isParentOf, below the child with a depth of levelToManage
        it will return all the parent identifier of all the links below the current child
        today, the maximum depth of a bom is around 40/45, but we don't want to retrieve more data than we need, so let's restrict it to the level to manage
     */
    xdmp.trace(TRACE_ID, "context.pn="+context.pn+" levelToManage="+levelToManage);
    const ids = sem.transitiveClosure(sem.iri(context.pn), sem.iri('http://airbus.com/xbom#isParentOf'), levelToManage + "")
    const msnQuery = (msns.length > 0 && msns != 99999) ? cts.jsonPropertyValueQuery("msns", msns) : cts.trueQuery()
    let cache = cts.valueCoOccurrences(
        cts.jsonPropertyReference("parent"),
        cts.uriReference(),
        ["map", "lazy"],
        cts.andQuery([
            cts.collectionQuery(["eBomLink", "caLink", "upperLink"]),
            cts.jsonPropertyRangeQuery("parent", "=", ids),
            cts.notQuery(cts.jsonPropertyValueQuery("childType", "CADNODE")), //Exlude CADNODE from listOfChild
            msnQuery
        ])
    )
    return cache;
}

function getPnsFromPath(path) {
    return path.split("/").filter(pn => pn).map(pn => {
        if (pn.includes("#")) {
            return fn.substringBefore(pn, "#")
        } else {
            return pn
        }
    })
}

function createPathRec(parentContext, parentMsns, linksCache, partCache, levelToManage, levelManaged) {
    xdmp.trace(TRACE_ID, "createPathRec:::levelToManage="+levelToManage+"  levelManaged="+1);
    // check if the level is lower or equal to the deepth we want to manage in this batch
    if (levelManaged <= levelToManage) {
        xdmp.trace(TRACE_ID, "pnParent="+parentContext.pn);
        const pnParent = parentContext.pn;
        const pathParent = parentContext.path;
        const pathCaParent = parentContext.caPath;
        const pathDsParent = parentContext.dsPath;
        const quantityParent = parentContext.quantity;
        const supplyPolicyParent = parentContext.supplyPolicy;
        const caTierOneParent = parentContext.caTierOne;
        const localPathParent = pathParent + "/" + pnParent;
        const typeParent = parentContext.parentType;
        const altPreferredParent = parentContext.altPreferred;

        // get the children of the current parent from the cache
        const children = linksCache[pnParent];
        xdmp.trace(TRACE_ID, "===================");
        xdmp.trace(TRACE_ID, children);
        xdmp.trace(TRACE_ID, "===================");

        // get the related links documents
        const childrenDocs = fn.doc(children)

        // for each children doc
        for (const childDocML of childrenDocs) {

            // Transform into Object() to get javascript types for the attributes
            const childDoc = childDocML.toObject()

            // check if the path already contains the child, if yes, then we are in a loop
            if (fn.contains(localPathParent, childDoc.child+'#')) {
                xdmp.trace(TRACE_ID, "loop detected - break")
                break
            }

            // get the context based on the $childrenDocs we are iterate on
            const childPn = childDoc.partNr+""
            const childType = childDoc.childType+""
            const childMsns = childDoc.msns

            // get the effectivity intersection between the father and the children
            const pathEffectivityArray = (parentMsns != 99999) ? parentMsns.filter(value => childMsns.includes(value)) : childMsns //TODO upgrade : fn.distinct

            // get the children quantity
            const childQuantity = (!childDoc.quantity || isNaN(childDoc.quantity)) ? 1 : xs.double(childDoc.quantity)

            // get the item number (set empty if null value)
            const itemNumber = (childDoc.itemNumber) ? childDoc.itemNumber+"" : ""

            // get the altCode (set empty if null value)
            const altCode = (childDoc.altCode) ? childDoc.altCode+"" : ""

            // check if this child has some children, if not, it's a leaf
            const isLeaf = (!linksCache[childPn]) // if linkCache[childPn] exists => not a leaf

            // build the json document
            const child = {}
            child.parent = pnParent
            child.pn = childPn
            child.program = childDoc.program
            child.type = childType
            child.isLeaf = isLeaf
            // propagation of altPreferred value
            if(childDoc.altPreferred && childDoc.altPreferred == "yes"){
                child.altPreferred = "yes"
            }else if(childDoc.altCode == null && altPreferredParent == "yes"){
                child.altPreferred = "yes"
            }

            if (childType === "CA" || childType === "CI" || childType === "ADAPCI") {
                child.caPath = pathCaParent + "/" + childPn + "#" + itemNumber + "#" + altCode + "#" + childQuantity
                child.dsPath = ""
            } else {
                child.caPath = pathCaParent
                child.dsPath = pathDsParent + "/" + childPn + "#" + itemNumber + "#" + altCode + "#" + childQuantity
            }

            child.path = child.caPath + child.dsPath
            child.parentHash = parentContext.hash
            child.hash = xdmp.hash64(child.path)

            child.quantity = quantityParent * childQuantity // propagate the quantity from the parent
            // TODO si CHILD EST stdpt
            // TODO unit (nha when STPTD voir spec modelisation)
            child.quantityLink = childQuantity // keep the link quantity in a dedicated attribute
            child.itemNumber = itemNumber
            child.altCode = altCode // get the altCode directly from the link document
            child.altPath = (altCode) ? parentContext.altPath + "/" + pnParent + "#" + altCode.padStart(3, PREFIX_PADDING_ALTCODE) : parentContext.altPath
            child.altPathPad = (altCode) ? parentContext.altPathPad + "/" + pnParent.padStart(30, PREFIX_PADDING_PN) + "#" + altCode.padStart(3, PREFIX_PADDING_ALTCODE) : parentContext.altPathPad
            child.altPathLevel = (altCode) ? (parentContext.altPathLevel !== "") ? parentContext.altPathLevel + 1 : 0 : parentContext.altPathLevel
            child.quantityUnitLink = childDoc.quantityUnit
            child.quantityUnit = (parentContext.quantityUnit && parentContext.quantityUnit != "EA" && parentContext.quantityUnit !== childDoc.quantityUnit) ? "ERROR" : childDoc.quantityUnit
            child.issue = (childDoc.childIssue) ? childDoc.childIssue : ""
            child.level = parentContext.level + 1
            child.caLevel = (["CA", "CI", "ADAPCI"].includes(childType)) ? (parentContext.caLevel !== "") ? parentContext.caLevel + 1 : 0 : parentContext.caLevel
            child.dsLevel = (["CA", "CI", "ADAPCI"].includes(childType)) ? "" : (parentContext.dsLevel !== "") ? parentContext.dsLevel + 1 : 0

            // ca rattachement direct
            child.ca = (childType === "CA") ? childPn : parentContext.ca
            // ds rattachement direct
            child.ds = (childType === "ADAPDS" && parentContext.ds === "") ? childPn : parentContext.ds

            child.uri = fn.baseUri(childDocML) // store the link document uri

            // Get the entity for the Child PN Number
            const searchEntityDoc = (childType === "CA") ? cts.doc("/ca/" + childDoc.program + "_" + childPn + ".json") : cts.doc(PREFIX_URI_CHILDTYPE[childType] + childPn + ".json") //TODO if CA search with Program+childPN (uri du doc CA) else search childPN
            let entityDoc = null
            if (searchEntityDoc) {
                entityDoc = searchEntityDoc.toObject()
            } else {
                xdmp.trace(TRACE_ID, "entityDoc not found for uri=" + PREFIX_URI_CHILDTYPE[childType] + childPn + ".json")
                //continue
            }

            // Some attributes from entity
            //child.description = (childType === "STDPT") ?  entityDoc.stdTitle : entityDoc.description
            child.linkType = childDoc.linkType

            // SUPPLY POLICY
            child.supplyPolicy = []
            child.caTierOne = caTierOneParent
            let currentSupplyPolicy = {}
            currentSupplyPolicy.supplier = []
            // Case first CA resp = RSP => Buy
            if (childType === "CA" && caTierOneParent === "" && entityDoc.resp+"" === "RSP") {
                child.caTierOne = entityDoc.code // Set caTierOne with current CA
                // Enrich Supply Policy - if suppliers exists in doc
                if (entityDoc.supplier) {
                    currentSupplyPolicy.mob = "buy"
                    currentSupplyPolicy.inType = ""
                    entityDoc.supplier.forEach(supplier => {
                        currentSupplyPolicy.supplier.push({
                            "groupName": supplier.groupName,
                            "supplierName": supplier.supplierName,
                            "supplierId": supplier.arpId,
                            "supplyType": supplier.supplyType,
                            "supplySource": supplier.supplySource
                        })
                    })
                }
            }
            if (["DDPT", "DASSY", "STDPT", "ADAPDS"].includes(childType)) { // NOT CA
                // Enrich Supply Policy - if suppliers exists in doc
                if (entityDoc.supplier) {
                    currentSupplyPolicy.mob = "buy"
                    currentSupplyPolicy.inType = ""
                    entityDoc.supplier.forEach(supplier => {
                        const plc = (entityDoc.plc) ? entityDoc.plc.find(plc => plc.plant === supplier.plant) : null
                        currentSupplyPolicy.supplier.push({
                            "groupName": supplier.groupName,
                            "supplierName": supplier.supplierName,
                            "supplierId": supplier.supplierId,
                            "supplyType": supplier.supplyType,
                            "supplySource": supplier.supplySource,
                            "plant": supplier.plant,
                            "plc": (plc) ? plc.plc : null
                        })
                    })
                }
            }

            // Case 4
            for (const supplyP of supplyPolicyParent) {
                let currentSupplyP = {}
                if (supplyP.mob === "buy") {
                    Object.assign(currentSupplyP, supplyP)
                    currentSupplyP.mob = "inBuy"
                    currentSupplyP.inPn = pnParent
                    currentSupplyP.inPath = pathParent
                    currentSupplyP.inType = typeParent
                    currentSupplyP.inQty = child.quantity / quantityParent
                    currentSupplyP.inUnit = child.quantityUnit
                    currentSupplyP.ratio = 1 / (nbUniqSupplierId(supplyP.supplier))
                } else if (supplyP.mob === "inBuy") {
                    Object.assign(currentSupplyP, supplyP)
                    currentSupplyP.mob = "inBuy"
                    currentSupplyP.inPn = supplyP.inPn
                    currentSupplyP.inPath = supplyP.inPath
                    currentSupplyP.inType = typeParent
                    currentSupplyP.inQty = child.quantity * supplyP.inQty / quantityParent
                    currentSupplyP.inUnit = childDoc.quantityUnit
                    currentSupplyP.ratio = 1 / (nbUniqSupplierId(supplyP.supplier))
                }
                child.supplyPolicy.push(currentSupplyP)
            }
            if (currentSupplyPolicy.supplier.length >= 1) {
                child.supplyPolicy.push(currentSupplyPolicy)
            }

            // Compteur de Supplier Buy et Supplier inBuy
            child.buyCount = child.supplyPolicy.filter(supply => supply.mob === "buy").length
            child.inBuyCount = child.supplyPolicy.filter(supply => supply.mob === "inBuy").length

            child.msns = pathEffectivityArray
            child.pnsParent = getPnsFromPath(child.path)

            // insert the document in the database
            xdmp.invokeFunction(
                () =>
                    xdmp.documentInsert(
                        child.path + ".json",
                        child,
                        {
                            permissions: permissions.getDefaultPermissions(),
                            metadata: {'updatedDate': fn.currentDateTime()},
                            collections: ["eBomLink/path"]
                        },
                    ),
                {update: 'true'}
            )

            // if we need to manage one more level, then call the same method for the child
            if ((levelManaged + 1) <= levelToManage) {
                createPathRec(child, pathEffectivityArray, linksCache, partCache, levelToManage, levelManaged + 1)
            }
        }
    }
}

function nbUniqSupplierId(arraySuppliers){
    const uniqSupplierId = []
    if(arraySuppliers) {
        for (const s of arraySuppliers) {
            if (!uniqSupplierId.includes(s.supplierId)) {
                uniqSupplierId.push(s.supplierId)
            }
        }
    }
    return uniqSupplierId.length
}

function generatePathByRoot(contextNoUsed, paramsNotUsed, input, options) {

    // Build the parent json document, this is the context for the children path generation
    const context = {}

    // Get attributes from input object
    const pn = input.pn+""
    const levelToManage = options.nbLevel
    const toPersist = options.toPersist
    xdmp.trace(TRACE_ID, "levelToManage::"+levelToManage);
    context.parent = "root"
    context.pn = pn
    context.type = input.type+""
    context.quantity = input.quantity
    context.quantityLink = input.quantity
    context.quantityUnit = input.quantityUnit
    context.level = input.level
    context.caLevel = input.caLevel
    context.dsLevel = input.dsLevel
    context.path = input.path+""
    context.currentPathGroup = input.currentPathGroup
    context.altPath = input.altPath
    context.altPathPad = input.altPathPad
    context.altPathLevel = input.altPathLevel
    context.caPath = input.caPath
    context.dsPath = input.dsPath
    context.ca = input.ca
    context.ds = input.ds
    context.hash = input.hash
    context.altPreferred = input.altPreferred


    context.supplyPolicy = (input.supplyPolicy) ? input.supplyPolicy : []
    context.caTierOne = (input.caTierOne) ? input.caTierOne : ""


    // If the input msn is equal to 99999, it means that we need to retrieve the effectivity from the links directly
    const msns = (input.msns == 99999) ? getRootEffectivity(pn) : input.msns
    context.msns = msns
    xdmp.trace(TRACE_ID, msns);

    // retrieve the children below this path for the depth lvlToManage +1, this way, we can identify wether we are on a leaf or not at the last level to manage
    const linksCache = xdmp.invokeFunction(
        () => { return getLinksCache(context, msns, xs.int(levelToManage) + 1) },
        { update: "false" }
    )
    xdmp.trace(TRACE_ID, linksCache);
    const partCache = {} //TODO not used for now ?

    // if we are working on the root node, we need to insert the document, for the next level, the path document already exist, we do not need to insert them again
    if (toPersist) {
        let uri = context.path + ".json";
        xdmp.trace(TRACE_ID, "Inserting doc "+ uri);
        xdmp.documentInsert(uri, context, permissions.getDefaultPermissions(), ["eBomLink/path"]);
    }

    // Call the recursive method that will create the path document for the children
    return createPathRec(context, msns, linksCache, partCache, levelToManage, 1);
}

function generatePathForRoot(input, program) {
    const context = {};

    // Get attributes from input object
    context.parent = "XXXXXX";
    context.pn = input.pn;
    context.type = input.type;
    context.quantity = input.quantity;
    context.quantityLink = input.quantity;
    context.quantityUnit = input.quantityUnit;
    context.level = input.level;
    context.caLevel = input.caLevel;
    context.dsLevel = input.dsLevel;
    context.path = input.path;
    context.currentPathGroup = input.currentPathGroup;
    context.altPath = input.altPath;
    context.altPathPad = input.altPathPad;
    context.altPathLevel = input.altPathLevel;
    context.caPath = input.caPath;
    context.dsPath = input.dsPath;
    context.ca = input.ca;
    context.ds = input.ds;
    context.hash = input.hash;
    context.altPreferred = input.altPreferred;
    context.supplyPolicy = (input.supplyPolicy) ? input.supplyPolicy : [];
    context.caTierOne = (input.caTierOne) ? input.caTierOne : "";

    // If the input msn is equal to 99999, it means that we need to retrieve the effectivity from the links directly
    const msns = (input.msns == 99999) ? getRootEffectivity(input.pn) : input.msns;
    context.msns = msns;
    xdmp.trace(TRACE_ID, msns);

    let uri = "/"+context.parent+"/"+program+"_"+input.parent+"_"+input.pn+".json";
    //let uri = context.path + ".json";
    xdmp.trace(TRACE_ID, "Inserting doc "+ uri);
    xdmp.documentInsert(uri, context, permissions.getDefaultPermissions(), ["eBomLink/path"]);
}

function generatePath(parentPath, id, collection)
{
    const newPath = {};
    let input = fn.head(xdmp.invokeFunction(
        () => {
            return fn.head(cts.search(
                cts.andQuery([
                    cts.collectionQuery(collection),
                    cts.jsonPropertyRangeQuery("child", "=", id)
                ]), ["unfiltered"])).toObject();
        },
        { update: "false" }
    ));

    newPath.pn = input.child;
    newPath.hash = xdmp.hash64(input.child)
    newPath.issue = input.childIssue;
    newPath.type = input.childType;
    newPath.program = input.program;
    newPath.parent = input.parent;
    newPath.parentHash = xdmp.hash64(input.parent)
    let itemNumber = (input.itemNumber) ? input.itemNumber+"" : "";
    let altCode = (input.altCode) ? input.altCode+"" : "";
    let quantity = (input.quantity) ? input.quantity+"" : "";
    let addToPath = "/" + input.child + "#" + itemNumber + "#" + altCode + "#" + quantity;
    if (input.childType == "CA" || input.childType == "ADAPCI") {
        newPath.ca = (input.childType == "ADAPCI" ) ? input.parent : ""
        newPath.caPath = parentPath.caPath + addToPath;
        newPath.caLevel = parentPath.caLevel + 1;
        newPath.ds = "";
        newPath.dsPath = "";
        newPath.dsLevel = "";
    } else {
        newPath.ca =  parentPath.ca;
        newPath.caPath = parentPath.caPath;
        newPath.caLevel = parentPath.caLevel;
        if (input.childType == "ADAPDS" ) {
            newPath.ds = input.child;
            newPath.dsPath = addToPath;
            newPath.dsLevel = 0;
        }
        else {
            newPath.ds = parentPath.ds;
            newPath.dsPath = parentPath.dsPath + addToPath;
            newPath.dsLevel = parentPath.dsLevel + 1;
        }
    }
    newPath.path = parentPath.path + addToPath;
    newPath.level = parentPath.level + 1;

    if (altCode) {
        newPath.altPathPad =  parentPath.altPathPad + "/" + input.child.padStart(30, PREFIX_PADDING_PN) + "#" + altCode.padStart(3, PREFIX_PADDING_ALTCODE)
        newPath.altPathLevel = (parentPath.altPathLevel ) ? parentPath.altPathLevel + 1 : 0;
    }
    else {
        newPath.altPathPad = parentPath.altPathPad;
        newPath.altPathLevel = parentPath.altPathLevel
    }

    if (parentPath.quantityUnit === "EA") {
        newPath.quantityUnit = input.quantityUnit;
        newPath.quantity = parentPath.quantity * input.quantity;
    }
    else if (parentPath.quantityUnit === "AS_NEEDED"){
        newPath.quantityUnit = "AS_NEEDED";
        newPath.quantity = 1;
    }
    else {
        newPath.quantityUnit = "ERROR";
        newPath.quantity = 1;
    }
    newPath.quantityLink = input.quantity;
    newPath.linkType = input.linkType;
    newPath.quantityUnitLink = input.quantityUnit;
    newPath.itemNumber = itemNumber;
    newPath.altCode = altCode;

    if (typeof(input.msns) != "object") input.msns = [input.msns] //bug ds msns qd un seul avion pas un array
    const intersection = (arr1, arr2) => {
        const set = new Set(arr2);
        const intersection = new Set(arr1.filter(elem => set.has(elem)));
        return Array.from(intersection);
    }
    newPath.msns = intersection(parentPath.msns, input.msns)
    //newPath.msns = parentPath.msns.filter(value => input.msns.includes(value));

    xdmp.documentInsert(newPath.path + ".json", newPath, {permissions : xdmp.defaultPermissions(),
        collections : 'eBomLink/path'});
}

module.exports = {
    generatePathByRoot,
    generatePathForRoot,
    generatePath,
    getRootEffectivity,
    getLinksCache
}
