This is a simple module to make a git repo appear similar to the object from
`require('fs')`, minus synchronous methods, and plus a commit method.

It's incomplete -- just read and write streams at this point, but it
illustrates the concept.

```javascript
var repo = jsGit(fsDb(platform.fs('pages.git')));
var vfs = require('js-git-as-fs')(repo);

vfs.createReadStream('test').pipe(process.stdout);
process.stdin.pipe(vfs.createWriteStream('input')).on('end', function () {
    vfs.commit("A nice log message");
});
```
# Atomicity

Writing a file yields a hash; since it has a path associated with it, it will
update an _internal_ index, ready for commit.

The commit operation is atomic, via locking.

The write-file operation is idempotent.

Updating a tree is one atomic operation per level of the tree. Writing
different data to the same path simultaneously will yield different trees
depending on the order of the end events.
