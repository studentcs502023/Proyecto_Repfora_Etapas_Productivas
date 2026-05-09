import google.generativeai as genai
from google.adk.agents.llm_agent import Agent
import os
import PyPDF2
from pathlib import Path



def read_text_file(file_path: str) -> str:
    """Lee el contenido de un archivo de texto (MD, JS, JSON, etc.)."""
    try:
        path = Path(file_path)
        if not path.exists():
            return f"Error: El archivo {file_path} no existe."
        return path.read_text(encoding='utf-8')
    except Exception as e:
        return f"Error leyendo archivo: {e}"

def read_pdf_file(file_path: str) -> str:
    """Lee y extrae el texto de un archivo PDF."""
    try:
        path = Path(file_path)
        if not path.exists():
            return f"Error: El archivo {file_path} no existe."
        
        with open(path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            return text if text else "El PDF parece estar vacío o no contiene texto extraíble."
    except Exception as e:
        return f"Error leyendo PDF: {e}"

def list_project_structure(dir_path: str = ".") -> str:
    """Lista los archivos y carpetas del proyecto para entender la estructura."""
    try:
        structure = []
        for path in Path(dir_path).rglob('*'):
            if '.git' in path.parts or 'node_modules' in path.parts or '.venv' in path.parts:
                continue
            depth = len(path.parts) - len(Path(dir_path).parts)
            indent = '  ' * depth
            structure.append(f"{indent}{'📁 ' if path.is_dir() else '📄 '}{path.name}")
        return "\n".join(structure)
    except Exception as e:
        return f"Error listando estructura: {e}"

# --- 3. INSTANCIA DEL AGENTE ---
root_agent = Agent(
    model='gemini-1.5-pro', # Cambiado a 1.5 Pro para mejor razonamiento con tools
    name='frontend_architect',
    instruction='''Eres un Arquitecto Senior de Frontend experto en Vue 3 (Composition API) y Quasar.
    Tu objetivo es ayudar a crear el frontend basado en el backend existente.
    
    TIENES HERRAMIENTAS PARA:
    1. Leer archivos de texto (read_text_file): Úsalas para leer modelos (.js), servicios y specs (.md).
    2. Leer archivos PDF (read_pdf_file): Úsalas para leer requerimientos en formato PDF.
    3. Listar archivos (list_project_structure): Úsala para explorar la estructura del backend.
    
    FLUJO DE TRABAJO:
    - Antes de proponer código, explora el backend para entender los "fields" y la lógica de negocio.
    - Usa la información de 'Data_Model.md' y los specs numerados (1 spec_auth.md, etc.).
    - Genera componentes de Quasar modernos, responsivos y con validación.
    - Tu tono es profesional y técnico. Responde en español.''',
    tools=[read_text_file, read_pdf_file, list_project_structure]
)

def chat_arquitecto():
    print("\n--- 🏗️ FRONTEND ARCHITECT AGENT (Con acceso a archivos) ---")
    print("El agente ahora puede leer tus archivos .md, .js y .pdf para entender el backend.")
    print("Escribe tus dudas o pide que analice un módulo (o 'salir' para terminar).\n")
    
    while True:
        user_input = input("👤 Tú: ")
        
        if user_input.lower() in ["salir", "exit", "quit"]:
            print("👋 ¡Éxito en tu desarrollo! Hasta luego.")
            break
        
        try:
            # El agente ahora usará sus herramientas si es necesario
            response = root_agent(input=user_input)
            
            respuesta_texto = response.text if hasattr(response, 'text') else str(response)
            
            print(f"\n🤖 Agente:\n{respuesta_texto}\n")
            print("-" * 50)

        except Exception as e:
            print(f"❌ Error técnico: {e}")

if __name__ == "__main__":
    chat_arquitecto()