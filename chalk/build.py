import re, json, io

worker = open('worker.js', encoding='utf-8').read()
client = open('client.html', encoding='utf-8').read()

# the map lives in one place: the worker. Inject it into the client.
page = (client.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${'))

out = io.StringIO()
out.write('/* ' + '='*70 + '\n')
out.write('   Chalk - single file build\n\n')
out.write('   Generated from worker.js and client.html so the whole game can be\n')
out.write('   deployed as one Cloudflare module. Edit those two, not this.\n')
out.write('   ' + '='*70 + ' */\n\n')
out.write('const PAGE = `' + page + '`;\n\n')
out.write(worker)
open('worker-single.js','w',encoding='utf-8').write(out.getvalue())
print('worker-single.js', len(out.getvalue()), 'bytes')
