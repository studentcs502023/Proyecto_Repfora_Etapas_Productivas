import os
import json
from pathlib import Path
import PyPDF2
from google import genai
from google.genai import types

def read_text_file(file_path: str) -> str:
    """
    Lee el contenido completo de cualquier archivo de texto plano del proyecto.
    Soporta extensiones como .txt, .md, .js, .vue, .json, entre otras.
    """
    try:
        # Convierte el string en un objeto Path seguro para Windows/Linux
        path = Path(file_path)
        if not path.exists():
            return f"Error: El archivo en '{file_path}' no existe."
            
        # Realiza la lectura forzando la codificación UTF-8
        return path.read_text(encoding='utf-8')
    except Exception as e:
        return f"Error al intentar leer el archivo de texto: {e}"


def read_pdf_file(file_path: str) -> str:
    """
    Lee e importa el contenido de texto extraíble desde un archivo PDF (como especificaciones de requerimientos).
    """
    try:
        path = Path(file_path)
        if not path.exists():
            return f"Error: El archivo PDF en '{file_path}' no existe."
            
        with open(path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            # Extrae el texto página por página de forma limpia
            texto_completo = "".join([page.extract_text() or "" for page in reader.pages])
            return texto_completo if texto_completo.strip() else "El PDF se leyó correctamente pero no contiene texto extraíble."
    except Exception as e:
        return f"Error al intentar leer el archivo PDF: {e}"


def list_project_structure(dir_path: str = ".") -> str:
    """
    Muestra la estructura de carpetas y archivos del proyecto de forma jerárquica.
    Ignora automáticamente directorios pesados u ocultos como .git, node_modules y .venv.
    """
    try:
        base_path = Path(dir_path)
        if not base_path.exists():
            return f"Error: El directorio '{dir_path}' no existe."
            
        lineas_estructura = []
        # Recorre todos los elementos omitiendo carpetas de entorno o dependencias
        for p in base_path.rglob('*'):
            if any(ignorar in p.parts for ignorar in ['.git', 'node_modules', '.venv']):
                continue
            
            icono = '📁 ' if p.is_dir() else '📄 '
            lineas_estructura.append(f"{icono}{p.name}")
            
        return "\n".join(lineas_estructura) if lineas_estructura else "El directorio está vacío o solo contiene carpetas ignoradas."
    except Exception as e:
        return f"Error al listar la estructura del proyecto: {e}"


# --- CONFIGURACIÓN DEL AGENTE ---
# Recuerda tener configurada tu variable de entorno GEMINI_API_KEY
client = genai.Client()
HISTORIAL_FILE = Path("historial_chat.json")

instructions = '''Eres un Arquitecto Senior de Frontend experto en Vue 3 (Composition API) y Quasar.
Tu objetivo es ayudar a crear el frontend basado en el backend existente.
Usa obligatoriamente tus herramientas para verificar archivos antes de responder.
Si la información no está en el proyecto, di que no la encontraste. Responde en español.'''

config = types.GenerateContentConfig(
    system_instruction=instructions,
    tools=[read_text_file, read_pdf_file, list_project_structure],
    temperature=0.0, 
)

# --- FUNCIONES DE PERSISTENCIA ---
def cargar_historial_previo():
    """Carga los mensajes anteriores si el archivo existe."""
    if HISTORIAL_FILE.exists():
        try:
            with open(HISTORIAL_FILE, 'r', encoding='utf-8') as f:
                datos = json.load(f)
                # Convertimos el JSON plano al formato de contenido que entiende el nuevo SDK de Gemini
                return [types.Content(role=m['role'], parts=[types.Part.from_text(text=m['text'])]) for m in datos]
        except Exception as e:
            print(f"⚠️ No se pudo cargar el historial previo: {e}")
    return []

def guardar_historial_en_disco(chat_session):
    """Guarda el historial de la sesión actual en un archivo JSON."""
    try:
        mensajes_guardar = []
        # Obtenemos los mensajes intercambiados en la sesión utilizando el método de la sesión del chat
        for conveniente in chat_session.get_history():
            # Extraemos el texto de las partes del contenido de forma segura
            texto = "".join([part.text for part in conveniente.parts if part.text])
            if texto:
                mensajes_guardar.append({
                    "role": conveniente.role,
                    "text": texto
                })
        
        with open(HISTORIAL_FILE, 'w', encoding='utf-8') as f:
            json.dump(mensajes_guardar, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"⚠️ Error al guardar el historial: {e}")


# --- BUCLE DE CONVERSACIÓN ---
def chat_arquitecto():
    print("\n--- 🏗️ FRONTEND ARCHITECT AGENT (Con memoria persistente) ---")
    
    # Cargamos la ventana de contexto guardada previamente en el archivo JSON
    historial_previo = cargar_historial_previo()
    if historial_previo:
        print(f"✨ Se recuperaron {len(historial_previo)} mensajes de la sesión anterior.")
    
    # Creamos el chat pasándole el historial de la sesión pasada
    agent_chat = client.chats.create(
        model='gemini-2.0-flash-exp',
        config=config,
        history=historial_previo
    )
    
    print("Escribe tus dudas o 'salir' para terminar.\n")
    
    while True:
        user_input = input("👤 Tú: ")
        
        if user_input.lower() in ["salir", "exit", "quit"]:
            # Justo antes de salir, salvamos la conversación en el archivo plano
            print("💾 Guardando contexto de la sesión...")
            guardar_historial_en_disco(agent_chat)
            print("👋 ¡Hasta luego!")
            break
            
        if not user_input.strip():
            continue
        
        try:
            # Envío correcto del mensaje usando el SDK genai de Google
            response = agent_chat.send_message(user_input)
            print(f"\n🤖 Agente:\n{response.text}\n")
            print("-" * 50)
            
            # Guardado rápido tras cada mensaje por si se cierra abruptamente la terminal
            guardar_historial_en_disco(agent_chat)

        except Exception as e:
            print(f"❌ Error técnico: {e}")

if __name__ == "__main__":
    chat_arquitecto()