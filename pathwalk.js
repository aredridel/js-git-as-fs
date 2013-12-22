module.exports = function pathWalk(hash, path, cb, up) {
    if (!cb) return pathWalk.bind(this, hash, path);

    if (typeof path == 'string') {
        path = path.split('/');
        path.shift();
    }

    var self = this;

    this.load(hash, function (err, obj) {
        console.log('load', hash, err, obj);
        var ent;
        if (err) return cb(err);

        if (!path[0]) return cb(null, obj, up);

        if (obj.type == 'tree' && (ent = find(obj.body, function (e) { return e.name == path[0]; }))) {
            return pathWalk.call(self, ent.hash, path.slice(1), cb, function finish (err, replacement, done) {
                if (err) return up(err);
                if (replacement) {
                    console.log('replace', obj.body[obj.body.indexOf(ent)].hash, 'with', hash);
                    obj.body[obj.body.indexOf(ent)].hash = replacement;
                    self.saveAs('tree', obj.body, function (err, newTree) {
                        console.log('save', newTree, err, obj);
                        if (err) return up(err);
                        up(null, newTree);
                    });
                } else {
                    up();
                }
            });
        } else {
            return cb("ENOENT");
        }

    });
};

function find(arr, cb) {
    for (var i in arr) {
        if (cb(arr[i])) return arr[i];
    }
}
