import os

base = r'c:\Users\marco\OneDrive\Documentos\SENAI\neurolab-v3-corrigido\neurolab-fixed'
files = [
    'area-paciente.html', 'convenios.html', 'especialidades.html',
    'exames.html', 'medicos.html', 'politica-privacidade.html',
    'sobre.html', 'teleconsulta.html', 'termos-de-uso.html', 'unidades.html'
]

polish_link = '  <link href="neurolab-polish.css" rel="stylesheet" />'

for f in files:
    path = os.path.join(base, f)
    with open(path, 'r', encoding='utf-8') as fp:
        content = fp.read()
    
    if 'neurolab-polish.css' in content:
        print(f'Skipped: {f}')
        continue
    
    # Insert after neurolab-v4.css line
    old = 'neurolab-v4.css" rel="stylesheet" />'
    new = old + '\n' + polish_link
    content = content.replace(old, new, 1)
    
    with open(path, 'w', encoding='utf-8') as fp:
        fp.write(content)
    print(f'Updated: {f}')
