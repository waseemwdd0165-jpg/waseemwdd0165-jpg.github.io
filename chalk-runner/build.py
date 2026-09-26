"""Fold client.html into worker.js so the whole game is one Cloudflare module.

Edit worker.js and client.html. Never edit worker-single.js, it is generated.
"""

import io

worker = open('worker.js', encoding='utf-8').read()
client = open('client.html', encoding='utf-8').read()

# the page becomes a template literal, so three things have to be escaped
page = client.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')

out = io.StringIO()
out.write('/* ' + '=' * 70 + '\n')
out.write('   Chalk Runner - single file build\n\n')
out.write('   Generated from worker.js and client.html so the whole game can be\n')
out.write('   deployed as one Cloudflare module. Edit those two, not this.\n')
out.write('   ' + '=' * 70 + ' */\n\n')
out.write('const PAGE = `' + page + '`;\n\n')
out.write(worker)

text = out.getvalue()
open('worker-single.js', 'w', encoding='utf-8').write(text)
print('worker-single.js', len(text), 'bytes')

# the whole file has to stay plain ASCII, it goes through several pipes
bad = [(i + 1, line) for i, line in enumerate(text.split('\n'))
       if any(ord(c) > 126 or (ord(c) < 32 and c != '\t') for c in line)]
if bad:
    print('NON ASCII on', len(bad), 'lines, first at line', bad[0][0])
    print('   ', bad[0][1][:120])
else:
    print('ascii clean')
