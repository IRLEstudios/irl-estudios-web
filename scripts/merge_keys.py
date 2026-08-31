#!/usr/bin/env python3
"""Fusiona en un JSON de contenido (tal y como lo devuelve /api/content) el
valor actual de uno o mas data-key-html. Primero intenta leerlo del HTML
estatico de la pagina; si esa clave no aparece ahi (por ejemplo, porque el
elemento se inserta en tiempo de ejecucion desde content-loader.js, como el
formulario de lead suave), recurre al JSON por defecto del repo en
site/content/<pagina>.json. No toca ninguna otra clave.

Uso: merge_keys.py current.json pagina.html clave1 [clave2 ...]
Imprime el JSON fusionado a stdout.
"""
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_key import extract  # noqa: E402


def repo_default_value(html_path, key):
    base = os.path.splitext(os.path.basename(html_path))[0]
    default_json_path = os.path.join(os.path.dirname(html_path), 'content', base + '.json')
    if not os.path.isfile(default_json_path):
        return None
    with open(default_json_path, encoding='utf-8') as f:
        defaults = json.load(f)
    return defaults.get(key)


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
        if new_val is not None:
            data[key] = new_val.strip()
            continue
        fallback_val = repo_default_value(html_path, key)
        if fallback_val is None:
            print(f'AVISO: no se encontró data-key-html="{key}" en {html_path} ni en site/content/', file=sys.stderr)
            continue
        data[key] = fallback_val

    json.dump(data, sys.stdout, ensure_ascii=False)


if __name__ == '__main__':
    main()
