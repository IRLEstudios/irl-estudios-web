#!/usr/bin/env python3
"""Extrae el valor de un campo editable [data-key*] de un archivo HTML del
sitio, igual que hace collectData() en site/admin/index.html:
  data-key-html="KEY"  -> innerHTML del elemento
  data-key-href="KEY"  -> atributo href
  data-key-src="KEY"   -> atributo src
  data-key="KEY"       -> textContent (recortado)

Uso: extract_key.py archivo.html clave
Imprime el valor extraído a stdout. Si no encuentra la clave en ningún
tipo de atributo, termina con código de salida 2 y un aviso en stderr.
"""
import sys
from html.parser import HTMLParser


class KeyExtractor(HTMLParser):
    """Extrae el innerHTML de [data-key-html="target_value"]."""

    def __init__(self, target_value):
        super().__init__(convert_charrefs=False)
        self.target_value = target_value
        self.depth = 0
        self.capturing = False
        self.parts = []
        self.result = None

    def handle_starttag(self, tag, attrs):
        attrs_d = dict(attrs)
        if not self.capturing and attrs_d.get('data-key-html') == self.target_value:
            self.capturing = True
            self.depth = 1
            return
        if self.capturing:
            self.depth += 1
            self.parts.append(self.get_starttag_text())

    def handle_startendtag(self, tag, attrs):
        if self.capturing:
            self.parts.append(self.get_starttag_text())

    def handle_endtag(self, tag):
        if self.capturing:
            self.depth -= 1
            if self.depth == 0:
                self.capturing = False
                self.result = ''.join(self.parts)
            else:
                self.parts.append('</' + tag + '>')

    def handle_data(self, data):
        if self.capturing:
            self.parts.append(data)

    def handle_entityref(self, name):
        if self.capturing:
            self.parts.append('&' + name + ';')

    def handle_charref(self, name):
        if self.capturing:
            self.parts.append('&#' + name + ';')

    def handle_comment(self, data):
        if self.capturing:
            self.parts.append('<!--' + data + '-->')


class AttrExtractor(HTMLParser):
    """Extrae un atributo (href/src) o el textContent de un elemento que
    tenga data-key-ATTRKIND="target_value", o data-key="target_value"
    para texto plano."""

    def __init__(self, attr_name, target_value):
        super().__init__(convert_charrefs=True)
        self.attr_name = attr_name  # 'href', 'src', o None para texto
        self.target_value = target_value
        self.data_attr = 'data-key' if attr_name is None else 'data-key-' + attr_name
        self.result = None
        self.depth = 0
        self.capturing_text = False
        self.text_parts = []

    def handle_starttag(self, tag, attrs):
        attrs_d = dict(attrs)
        if attrs_d.get(self.data_attr) != self.target_value:
            if self.capturing_text:
                self.depth += 1
            return
        if self.attr_name is None:
            self.capturing_text = True
            self.depth = 1
            self.text_parts = []
        else:
            self.result = attrs_d.get(self.attr_name)

    def handle_startendtag(self, tag, attrs):
        attrs_d = dict(attrs)
        if attrs_d.get(self.data_attr) == self.target_value and self.attr_name is not None:
            self.result = attrs_d.get(self.attr_name)

    def handle_endtag(self, tag):
        if self.capturing_text:
            self.depth -= 1
            if self.depth == 0:
                self.capturing_text = False
                self.result = ''.join(self.text_parts).strip()

    def handle_data(self, data):
        if self.capturing_text:
            self.text_parts.append(data)


def extract(html_path, key):
    """Prueba en orden data-key-html, data-key-href, data-key-src, data-key.
    Devuelve el valor encontrado, o None si no aparece en ninguno."""
    with open(html_path, encoding='utf-8') as f:
        html = f.read()

    p = KeyExtractor(key)
    p.feed(html)
    if p.result is not None:
        return p.result.strip()

    for attr_name in ('href', 'src', None):
        p2 = AttrExtractor(attr_name, key)
        p2.feed(html)
        if p2.result is not None:
            return p2.result

    return None


def main():
    if len(sys.argv) != 3:
        print('Uso: extract_key.py archivo.html clave', file=sys.stderr)
        sys.exit(1)
    html_path, key = sys.argv[1], sys.argv[2]
    result = extract(html_path, key)
    if result is None:
        print(f'No se encontró ningún data-key*="{key}" en {html_path}', file=sys.stderr)
        sys.exit(2)
    sys.stdout.write(result)


if __name__ == '__main__':
    main()
