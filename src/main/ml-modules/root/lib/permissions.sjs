const permissions = [xdmp.permission('xbom-reader-role', 'read'), xdmp.permission('xbom-writer-role', 'update')]

function getDefaultPermissions() {
    return permissions;
}

module.exports = {
    getDefaultPermissions
}
