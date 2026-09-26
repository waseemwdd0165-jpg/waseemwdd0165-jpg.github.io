import re, json, io

worker = open('worker.js', encoding='utf-8').read()
client = open('client.html', encoding='utf-8').read()

# the map lives in one place: the worker. Inject it into the client.
rows = re.findall(r'"([^"]*)"', re.search(r'export const MAP = \[(.*?)\];', worker, re.S).group(1))
assert len(rows) > 30 and len(set(len(r) for r in rows)) == 1, 'map rows look wrong'
client = client.replace('__MAP__', json.dumps(rows))
assert '__MAP__' not in client

page = (client.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${'))

out = io.StringIO()
out.write('/* ' + '='*70 + '\n')
out.write('   Sunday Park - single file build\n\n')
out.write('   Generated from worker.js and client.html so the whole park can be\n')
out.write('   deployed as one Cloudflare module. Edit those two, not this.\n')
out.write('   ' + '='*70 + ' */\n\n')
out.write('const PAGE = `' + page + '`;\n\n')
out.write(worker)
open('worker-single.js','w',encoding='utf-8').write(out.getvalue())
print('worker-single.js', len(out.getvalue()), 'bytes; map', len(rows), 'x', len(rows[0]))
