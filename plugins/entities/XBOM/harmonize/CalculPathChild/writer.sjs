/*~
 * Writer Plugin
 *
 * @param id       - the identifier returned by the collector
 * @param envelope - the final envelope
 * @param options  - an object options. Options are sent from Java
 *
 * @return - nothing
 */
const DataHub = require("/data-hub/5/datahub.sjs");
const config = new DataHub().config


function write(id, result, options) {

// do nothing, the paths are directly inserted during in the main.sjs

}

module.exports = write;


