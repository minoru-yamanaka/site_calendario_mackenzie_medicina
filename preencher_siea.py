import zipfile
import json
import re
import os
import sys
import copy
import xml.etree.ElementTree as ET

def set_cell_text(cell, text):
    # Namespace do Word Processing
    w_ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    t_elements = cell.findall(f'.//{{{w_ns}}}t')
    if t_elements:
        t_elements[0].text = text
        for t_el in t_elements[1:]:
            t_el.text = ""

def set_checkbox_state(cell, mark_checked):
    w_ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    w14_ns = 'http://schemas.microsoft.com/office/word/2010/wordml'
    
    # Encontra o checkbox estruturado
    checkboxes = cell.findall(f'.//{{{w14_ns}}}checkbox')
    for cb in checkboxes:
        checked_el = cb.find(f'{{{w14_ns}}}checked')
        if checked_el is not None:
            checked_el.set(f'{{{w14_ns}}}val', '1' if mark_checked else '0')
            
    # Atualiza o caractere visual do checkbox no texto w:t
    t_elements = cell.findall(f'.//{{{w_ns}}}t')
    for t_el in t_elements:
        if t_el.text in ['☐', '☒', '[ ]', '[X]']:
            t_el.text = '☒' if mark_checked else '☐'

def preencher_siea(json_dados_path, docx_template_path, docx_output_path):
    with open(json_dados_path, 'r', encoding='utf-8') as f:
        aulas = json.load(f)

    # Horários dos períodos letivos
    HORARIOS_PERIODOS = {
        "1": "07:30 - 08:20",
        "2": "08:20 - 09:10",
        "3": "09:10 - 10:00",
        "4": "10:20 - 11:10",
        "5": "11:10 - 12:00",
        "6": "12:00 - 12:50",
        "7": "13:30 - 14:20",
        "8": "14:20 - 15:10",
        "9": "15:10 - 16:00",
        "10": "16:20 - 17:10",
        "11": "17:10 - 18:00",
        "12": "18:00 - 18:50"
    }

    temp_docx_dir = os.path.dirname(docx_output_path)
    if temp_docx_dir and not os.path.exists(temp_docx_dir):
        os.makedirs(temp_docx_dir)

    # Word XML namespaces
    namespaces = {
        'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'w14': 'http://schemas.microsoft.com/office/word/2010/wordml'
    }
    ET.register_namespace('w', namespaces['w'])
    ET.register_namespace('w14', namespaces['w14'])

    # Abre o template original e extrai o XML principal
    with zipfile.ZipFile(docx_template_path, 'r') as z_in:
        document_xml = z_in.read("word/document.xml")
        
        # Copia todos os outros arquivos do zip original de forma inalterada
        out_zip_data = {item.filename: z_in.read(item.filename) for item in z_in.infolist() if item.filename != "word/document.xml"}

    root = ET.fromstring(document_xml)
    tables = root.findall('.//w:tbl', namespaces)
    
    if len(tables) < 2:
        raise ValueError("Tabela de dados do SIEA não encontrada no documento.")

    table1 = tables[1]
    rows = table1.findall('.//w:tr', namespaces)
    
    # Salva a linha 2 como template original
    template_row = copy.deepcopy(rows[2])
    
    # Encontra o elemento pai (w:tbl) para inserirmos as linhas abaixo dos cabeçalhos
    # O cabeçalho ocupa a linha 0 e a linha 1 da tabela
    # Remove as linhas de dados vazias originais (linhas 2 em diante)
    for row in rows[2:]:
        table1.remove(row)

    # Preenche a tabela com as aulas ativas
    for idx, aula in enumerate(aulas):
        # Cria uma nova linha clonando o template original (preserva formatação e estilos)
        new_row = copy.deepcopy(template_row)
        cells = new_row.findall('.//w:tc', namespaces)
        
        if len(cells) < 17:
            continue
            
        # 0. Nº Sequência
        set_cell_text(cells[0], str(idx + 1))
        
        # 1. Matrícula / DRT
        drt = ""
        drt_match = re.search(r'DRT:\s*(\d+)', aula.get('professor', ''))
        if drt_match:
            drt = drt_match.group(1)
        set_cell_text(cells[1], drt)
        
        # 2. Nome do Professor
        nome = aula.get('professor', '').split("-")[0].strip() if '-' in aula.get('professor', '') else aula.get('professor', '')
        set_cell_text(cells[2], nome)
        
        # 3. Regime (PPP)
        set_cell_text(cells[3], "PPP")
        
        # 4. Ação: Incluir (marca cells[4], desmarca cells[5] e cells[6])
        set_checkbox_state(cells[4], True)
        set_checkbox_state(cells[5], False)
        set_checkbox_state(cells[6], False)
        
        # 7. Código do Componente
        cod_comp = ""
        cod_match = re.search(r'-\s*([A-Z0-9]+)', aula.get('disciplina', ''))
        if cod_match:
            cod_comp = cod_match.group(1)
        else:
            cod_comp = aula.get('disciplina', '').split("-")[-1].strip()
        set_cell_text(cells[7], cod_comp)
        
        # 8. Turma (ex: "Turma 2M" -> "2M")
        turma = aula.get('turma', '').replace("Turma ", "").strip()
        set_cell_text(cells[8], turma)
        
        # 9 a 14. Dia da Semana (Seg a Sáb)
        dia = aula.get('dia_semana', 1)
        # cells[9]: Seg, cells[10]: Ter, cells[11]: Qua, cells[12]: Qui, cells[13]: Sex, cells[14]: Sáb
        set_checkbox_state(cells[9], dia == 1)
        set_checkbox_state(cells[10], dia == 2)
        set_checkbox_state(cells[11], dia == 3)
        set_checkbox_state(cells[12], dia == 4)
        set_checkbox_state(cells[13], dia == 5)
        set_checkbox_state(cells[14], dia == 6)
        
        # 15. Horário (ex: "07:30 - 08:20")
        periodo = aula.get('periodo', '1')
        horario = HORARIOS_PERIODOS.get(periodo, "07:30 - 08:20")
        set_cell_text(cells[15], horario)
        
        # 16. Vigência (10/08/2026)
        set_cell_text(cells[16], "10/08/2026")
        
        # Adiciona a linha preenchida na tabela
        table1.append(new_row)

    # Grava o XML do documento modificado de volta
    document_xml_modified = ET.tostring(root, encoding='utf-8')
    
    # Salva o arquivo .docx preenchido preservando os demais arquivos originais
    with zipfile.ZipFile(docx_output_path, 'w', zipfile.ZIP_DEFLATED) as z_out:
        z_out.writestr("word/document.xml", document_xml_modified)
        for filename, data in out_zip_data.items():
            z_out.writestr(filename, data)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Uso: python preencher_siea.py <json_dados_path> <docx_template_path> <docx_output_path>")
        sys.exit(1)
        
    json_dados = sys.argv[1]
    docx_template = sys.argv[2]
    docx_output = sys.argv[3]
    
    try:
        preencher_siea(json_dados, docx_template, docx_output)
        print("Sucesso")
    except Exception as e:
        print(f"Erro: {e}")
        sys.exit(1)
