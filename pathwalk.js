module.exports = function pathWalk(hash, path, cb, n) {
    if (!cb) return pathWalk.bind(this, hash, path);
    if (!n) n = 1;

    if (!this._index) this._index = {};

    var pathParts = path.split('/');
    var self = this;

    var nodes = {};

    this.load(hash, function (err, obj) {
        console.log('load', hash, err, obj);
        if (err) return cb(err);

        nodes[pathParts.slice(0, n).join('/')] = obj;

        if (!pathParts[n]) return cb(null, obj, nodes);

        var ent;
        if (obj.type == 'tree' && (ent = obj.body[pathParts[n]])) {
            return pathWalk.call(self, ent.hash, path, cb, n + 1);
        } else {
            return cb(null, null, nodes);
        }
    });
};
