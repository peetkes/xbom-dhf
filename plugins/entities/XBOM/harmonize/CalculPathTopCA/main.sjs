const dhf = require("/data-hub/4/dhf.sjs");
const deepBomJS = require("/lib/path/deepBOMPathGenJS.sjs");

const writerPlugin = require("./writer.sjs");

/*
 * Plugin Entry point
 *
 * @param id          - the identifier returned by the collector
 * @param options     - a map containing options. Options are sent from Java
 *
 */
function main(id, options) {
    xdmp.trace("xbom-root", "In main module with transaction " + xdmp.transaction() + " mode="+xdmp.getTransactionMode());
    // prepare some options
    let queryOption = {
        toPersist: true,
        nbLevel: options.nbLevel
    };

    // the very first path to be generated will look like below, except the msn list, it will retrieve it from the links in database
    // might be improved in order to provide only the usefull attributes
    const path = "/" + id + "###1" //With itemNumber=empty ; altCode=empty ; quantity=1
    const query = {
        msns: 99999,
        parent: "",
        pn: id,
        type: "CA",
        altCode: "struct",
        level: 0,
        caLevel: 0,
        quantity: 1,
        quantityLink: 1,
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
    deepBomJS.generatePathByRoot({}, {}, query, queryOption);

    dhf.runWriter(writerPlugin, id, "", options);
}

module.exports = {
    main: main,
};
