var pathWalk = require('./pathwalk');
var stream = require('stream');
var concat = require('concat-stream');
var pathToEntry = require('./path-to-entry');
var async = require('async');

module.exports = function wrap(repo, ref, cb) {
    repo.load(ref, function (err, head) {
        if (err) return cb(err);
        var root = head.body.tree;
        cb(null, {
            _index: {},

            createReadStream: function (path) {
                var s = new stream.PassThrough();

                pathWalk.call(repo, root, path, function (err, obj) {
                    if (err) return s.emit('error', err);
                    if (!obj) return s.emit('error', 'ENOENT');
                    if (obj.type == 'blob') {
                        s.end(obj.body);
                    } else {
                        s.emit('error', 'EISDIR');
                    }
                });

                return s;
            },

            createWriteStream: function (path) {
                var self = this;
                var pathParts = path.split('/');
                var s = concat(function (data, done) {
                    pathWalk.call(repo, root, path, function (err, obj, nodes) {
                        if (err) return s.emit('error', err);
                        if (!obj || obj.type == 'blob') {
                            repo.saveAs('blob', data, function (err, hash) {
                                if (err) return s.emit('error', err);
                                self._index[path] = {type: 'blob', hash: hash};
                                done();
                            });
                        } else {
                            s.emit('error', 'EISDIR');
                        }
                    });
                });
                return s;
            },

            commit: function (message, cb) {
                var cache = {};
                function commitTree(tree) {
                    repo.resolve(ref, function (err, lastCommit) { // FIXME: this should be cached, and merge warnings issued if it's not fast forward.
                        if (err) return cb(err);
                        console.log('commit', tree);
                        repo.saveAs('commit', {
                            tree: tree,
                            parents: [lastCommit],
                            author: {
                                name: "Aria Stewart",
                                email: "aredridel@nbtsc.org",
                                date: new Date()
                            },
                            committer: {
                                name: "Aria Stewart",
                                email: "aredridel@nbtsc.org", 
                                date: new Date()
                            },
                            message: message
                        }, function (err, hash) {
                            if (err) return cb(err);
                            root = tree;
                            repo.writeRef('refs/heads/' + ref, hash, function (err) {
                                if (err) return cb(err);
                                console.log('commit with message', message, 'tree', tree, 'gives', hash);
                                cb();
                            });
                        });
                    });
                }

                function writeTrees(index, after) {
                    var queue = Object.keys(index).sort(longestFirst);
                    var newRoot;
                    async.whilst(function () { return queue.length; }, function (next) {
                        var path = queue.shift();
                        if (cache[parent(path)]) {
                            writeEnt(path, cache[parent(path)], next);
                        } else {
                            pathToEntry.call(repo, root, parent(path), function (err, ent) {
                                if (err) return next(err);
                                if (!ent) return next('ENOENT');
                                cache[parent(path)] = ent;
                                writeEnt(path, ent, next);
                            });
                        }
                    }, function (err) {
                        if(err) return cb(err);
                        commitTree(newRoot);
                    });

                    function writeEnt(path, ent, cb) {
                        var sub;
                        if (path) {
                            if (!(sub = find(ent.tree, function (e) { return e.name == basename(path); }))) {
                                ent.tree.push(sub = {mode: 0100644, name: basename(path), hash: index[path].hash});
                            } else {
                                sub.hash = index[path].hash;
                            }
                        }

                        repo.saveAs('tree', ent.tree, function (err, hash) {
                            if (err) return cb(err);

                            if (path) {
                                queue.push(parent(path));
                                if (!index[parent(path)]) {
                                    index[parent(path)] = {mode: 040000, name: basename(parent(path)), hash: hash};
                                }
                            } else {
                                newRoot = hash;
                            }

                            cb();
                        });
                    }
                }

                writeTrees(this._index);
            }
        });
    });
};

function longestFirst(a, b) {
    return a.length - b.length;
}

function parent(path) {
    return path.split('/').slice(0, -1).join('/');
}

function basename(path) {
    return path.split('/').pop();
}

function find(array, fn) {
    for (var i in array) {
        if (fn(array[i])) return array[i];
    }

    return null;
}
