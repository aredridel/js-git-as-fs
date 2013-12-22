var pathWalk = require('./pathwalk');
var stream = require('stream');
var concat = require('concat-stream');

module.exports = function wrap(repo, ref, cb) {
    repo.load(ref, function (err, head) {
        if (err) return cb(err);
        var root = head.body.tree;
        cb(null, {
            createReadStream: function (path) {
                var s = new stream.PassThrough();

                pathWalk.call(repo, root, path, function (err, obj, finish) {
                    if (err) return s.emit('error', err);
                    if (obj.type == 'blob') {
                        s.end(obj.body);
                        finish();
                    } else {
                        s.emit('error', 'EISDIR');
                    }
                }, function (err, hash) {
                    if (err) return s.emit('error', err);
                });

                return s;
            },

            createWriteStream: function (path) {
                var s = concat(function (data, done) {
                    pathWalk.call(repo, root, path, function (err, obj, finish) {
                        if (err) return s.emit('error', err);
                        if (obj.type == 'blob') {
                            repo.saveAs('blob', data, function (err, hash) {
                                if (err) return s.emit('error', err);
                                finish(null, hash);
                            });
                        } else {
                            s.emit('error', 'EISDIR');
                        }
                    }, function (err, hash) {
                        if (err) return s.emit('error', err);
                        head.body.tree = root = hash;
                        done();
                    });
                });
                return s;
            },

            commit: function (message, cb) {
                repo.resolve(ref, function (err, lastCommit) { // FIXME: this should be cached, and merge warnings issued if it's not fast forward.
                    if (err) return cb(err);
                    repo.saveAs('commit', {
                        tree: root,
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
                        repo.writeRef('refs/heads/' + ref, hash, function (err) {
                            if (err) return cb(err);
                            console.log('commit with message', message, 'tree', root, 'gives', hash);
                        });
                    });
                });
            }
        });
    });
};
