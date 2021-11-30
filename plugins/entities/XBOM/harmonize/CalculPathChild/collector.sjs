function collect(options) {

    const level =  xs.int(options.level)

    // the first levels of the paths are already generated
    // we need to load start the path generation from those level but only for the non leaf ones
    let pathLevel = cts.uris(
        null,
        null,
        cts.andQuery([
            cts.collectionQuery("eBomLink/path"),
            cts.jsonPropertyValueQuery("isLeaf", false),
            cts.jsonPropertyValueQuery("level", level),
        ])
    );

    xdmp.log(
        "number of path to manage: " + fn.count(pathLevel) + " for the lvl : " + level
    );

    return pathLevel;
}

module.exports = {
    collect: collect,
};
