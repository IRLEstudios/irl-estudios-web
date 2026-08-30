#!/usr/bin/env python3
"""Fusiona en un JSON de contenido (tal y como lo devuelve /api/content) el
HTML actual de uno o mas data-key-html, leido directamente del archivo
.html del sitio. No toca ninguna otra clave.

Uso: merge_keys.py current.json pagina.html clave1 [clave2 ...]
Imprime el JSON fusionado a stdout.
"""
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_key import extract  # noqa: E402


def main():
    if len(sys.argv) < 4:
        print('Uso: merge_keys.py current.json pagina.html clave1 [clave2 ...]', file=sys.stderr)
        sys.exit(1)
    current_json_path, html_path = sys.argv[1], sys.argv[2]
    keys = sys.argv[3:]

    with open(current_json_path, encoding='utf-8') as f:
        data = json.load(f)

    for key in keys:
        new_val = extract(html_path, key)
        if new_val is None:
            print(f'AVISO: no se encontró data-key-html="{key}" en {html_path}', file=sys.stderr)
            continue
        data[key] = new_val.strip()

    json.dump(data, sys.stdout, ensure_ascii=False)


if __name__ == '__main__':
    main()
