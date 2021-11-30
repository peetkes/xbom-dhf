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

  // the start of this batch is an existing path itself
  // can we add some index in order to open a document ? 
  let query = cts.doc(id).toObject();

  // prepare some options, see that here, we do not want to persist the first level because it already exists in the database
  let queryOption = {
    nbLevel: options.nbLevel
  };

  deepBomJS.generatePathByRoot({}, {}, query, queryOption);

  dhf.runWriter(writerPlugin, id, "", options);
}

module.exports = {
  main: main,
};
