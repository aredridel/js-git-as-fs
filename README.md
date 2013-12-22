This is a simple module to make a git repo appear similar to the object from
`require('fs')`, minus synchronous methods, and plus a commit method.

It's incomplete -- just read and write streams at this point, but it
illustrates the concept.

```
var repo = jsGit(fsDb(platform.fs('pages.git')));
var vfs = require('js-git-as-fs')(repo);

vfs.createReadStream('test').pipe(process.stdout);
process.stdin.pipe(vfs.createWriteStream('input')).on('end', function () {
    vfs.commit("A nice log message");
});
```
