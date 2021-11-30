function collect(options) {
  xdmp.trace("xbom-root", "In collector with transaction " + xdmp.transaction() + " mode="+xdmp.getTransactionMode());

  // limit the search to all the CA
  let caScope = cts.collectionQuery("caLink")

  //search for the all the parent who do not have parent themselves
  let allCaRoots =  sem.sparql(`
    SELECT DISTINCT ?parent  WHERE {
    ?parent <http://airbus.com/xbom#isParentOf> ?child.
    FILTER NOT EXISTS {?gparent <http://airbus.com/xbom#isParentOf> ?parent }
    }  
  `,null,["map"],caScope).toArray().map(item => item.parent)

  return allCaRoots;
}

module.exports = {
  collect: collect,
};
