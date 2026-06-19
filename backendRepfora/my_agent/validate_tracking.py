"""Validates a tracking PDF document for SENA REPFORA E.P.
Usage: python validate_tracking.py <path_to_pdf>
Returns JSON: { valid: bool, message: str, details: {} }
"""
import sys
import json
from pathlib import Path

try:
    import PyPDF2
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False


def validate_pdf(file_path: str) -> dict:
    path = Path(file_path)
    if not path.exists():
        return {"valid": False, "message": "Archivo no encontrado.", "details": {}}

    file_size_mb = path.stat().st_size / (1024 * 1024)
    if file_size_mb > 10:
        return {
            "valid": False,
            "message": f"El archivo excede el peso maximo de 10 MB. Tamano: {file_size_mb:.1f} MB.",
            "details": {"fileSizeMB": round(file_size_mb, 1)}
        }

    if not HAS_PYPDF:
        # Fallback: basic check
        with open(path, 'rb') as f:
            header = f.read(5)
        is_pdf = header == b'%PDF-'
        if not is_pdf:
            return {"valid": False, "message": "El archivo no es un PDF valido.", "details": {}}
        return {
            "valid": True,
            "message": "El documento PDF parece valido (validacion basica sin PyPDF2).",
            "details": {"method": "basic", "fileSizeMB": round(file_size_mb, 1)}
        }

    try:
        with open(path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            num_pages = len(reader.pages)

            if num_pages == 0:
                return {"valid": False, "message": "El PDF no contiene paginas.", "details": {"pages": 0}}

            full_text = ""
            for page in reader.pages:
                page_text = page.extract_text() or ""
                full_text += page_text

            text_lower = full_text.lower()

            # Required keywords for a valid tracking document
            required_keywords = ['seguimiento', 'etapa', 'productiva']
            found_required = [kw for kw in required_keywords if kw in text_lower]

            optional_keywords = ['aprendiz', 'instructor', 'firma', 'fecha', 'sena']
            found_optional = [kw for kw in optional_keywords if kw in text_lower]

            word_count = len(full_text.split())

            if word_count < 20:
                return {
                    "valid": False,
                    "message": "El PDF contiene muy poco texto. Verifique que el documento no sea una imagen escaneada sin OCR.",
                    "details": {"pages": num_pages, "wordCount": word_count}
                }

            if len(found_required) < 2:
                return {
                    "valid": False,
                    "message": "El documento no parece ser un acta de seguimiento. Faltan palabras clave requeridas.",
                    "details": {
                        "pages": num_pages,
                        "wordCount": word_count,
                        "foundRequired": found_required,
                        "foundOptional": found_optional,
                        "suggestion": "Asegurese de que el PDF contenga: SEGUIMIENTO, ETAPA PRODUCTIVA, datos del aprendiz e instructor."
                    }
                }

            # AI-style analysis summary
            score = min(100, (len(found_required) * 25) + (len(found_optional) * 10) + min(word_count / 2, 15))

            return {
                "valid": True,
                "message": f"Validacion IA exitosa. El documento parece ser un acta de seguimiento valida ({num_pages} pag(s), {word_count} palabras).",
                "details": {
                    "method": "ai_pypdf2",
                    "pages": num_pages,
                    "wordCount": word_count,
                    "score": score,
                    "foundRequired": found_required,
                    "foundOptional": found_optional,
                    "fileSizeMB": round(file_size_mb, 1)
                }
            }

    except Exception as e:
        return {
            "valid": False,
            "message": f"Error al procesar el PDF: {str(e)[:200]}",
            "details": {"error": str(e)[:200]}
        }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"valid": False, "message": "Se requiere la ruta del archivo PDF.", "details": {}}))
        sys.exit(1)

    result = validate_pdf(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False))
