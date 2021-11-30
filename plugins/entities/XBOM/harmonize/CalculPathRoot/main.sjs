const dhf = require("/data-hub/4/dhf.sjs");
const recPath = require("/lib/path/RecPathNew.sjs");

const writerPlugin = require("./writer.sjs");
const defaultCacheSize = 200;

/*
 * Plugin Entry point
 *
 * @param id          - the identifier returned by the collector
 * @param options     - a map containing options. Options are sent from Java
 *
 */
function main(id, options) {
    xdmp.trace("xbom-root", "In main module with transaction " + xdmp.transaction() + " mode="+xdmp.getTransactionMode());
    xdmp.trace("xbom-root", "processing id  " + id);
    xdmp.trace("xbom-root", options);

    recPath.init(id, "SA", "structure", (options.cacheSize || defaultCacheSize));

    dhf.runWriter(writerPlugin, id, "", options);
}

module.exports = {
    main: main,
};
