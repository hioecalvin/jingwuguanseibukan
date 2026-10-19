import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const context={exports:{}};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/image-upload.ts','utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText,context);
const extension=context.exports.imageUploadExtension;

test('upload paths use a canonical extension for supported MIME types',()=>{
 assert.equal(extension('image/jpeg'),'jpg');
 assert.equal(extension('image/png'),'png');
 assert.equal(extension('image/webp'),'webp');
});
test('unsupported, empty and forged MIME values are rejected',()=>{
 for(const mime of ['', 'image/svg+xml','image/gif','image/heic','text/html','image/jpeg; charset=utf8','IMAGE/PNG','__proto__'])
  assert.equal(extension(mime),null);
});
test('both upload pages use the shared validator and recheck the size before upload',()=>{
 for(const file of ['app/(member)/profile/page.tsx','app/admin/classes/page.tsx']){
  const source=readFileSync(file,'utf8');
  assert.match(source,/import \{ imageUploadExtension \} from "@\/lib\/image-upload"/);
  assert.match(source,/imageUploadExtension\((avatarFile|file)\.type\)/);
  assert.match(source,/if \(!extension \|\| (avatarFile|file)\.size > 5 \* 1024 \* 1024\)/);
  assert.doesNotMatch(source,/(avatarFile|file)\.name\s*\.split\("\."\)/);
 }
});
