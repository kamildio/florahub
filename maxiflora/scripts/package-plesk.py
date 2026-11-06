"""Package only built code in the Passenger adapter's actual directory. No runtime secrets/dependencies."""
from pathlib import Path
import sys,zipfile
root=Path(__file__).resolve().parent.parent
output=Path(sys.argv[1]).resolve()
source=root/'.next-node/standalone'
assert (source/'.next-node/BUILD_ID').is_file(), 'Build must finish before packaging'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
 for path in source.rglob('*'):
  relative=path.relative_to(source)
  if not path.is_file() or path.is_symlink() or any(part in ('node_modules','.git') for part in relative.parts):continue
  if path.name.startswith('.env') or path.name in ('.runtime-secrets.env','.smtp-private.env','.staff-owner-id','.staff-mfa-key','.maintenance-key','.maintenance-lock','.maintenance-status.json','.runtime-status.json'):continue
  archive.write(path,'maxiflora-app/.next-node/standalone/'+relative.as_posix())
 archive.write(root/'app.cjs','maxiflora-app/app.cjs')
 for folder in ('server','lib/maxiflora'):
  for path in (root/folder).glob('*.mjs'):
   archive.write(path,'maxiflora-app/'+path.relative_to(root).as_posix())
with zipfile.ZipFile(output) as archive:
 assert 'maxiflora-app/.next-node/standalone/.next-node/BUILD_ID' in archive.namelist()
 assert all(name=='maxiflora-app/app.cjs' or name.startswith(('maxiflora-app/.next-node/standalone/','maxiflora-app/server/','maxiflora-app/lib/maxiflora/')) for name in archive.namelist())
print(output,output.stat().st_size)
