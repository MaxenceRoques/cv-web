import base64
import io
import sys
from pypdf import PdfReader, PdfWriter

title = base64.b64decode(sys.argv[1]).decode("utf-8")
language = base64.b64decode(sys.argv[2]).decode("utf-8")
reader = PdfReader(io.BytesIO(sys.stdin.buffer.read()))
writer = PdfWriter()
writer.clone_document_from_reader(reader)
writer.add_metadata({
    "/Title": title,
    "/Author": "Maxence Roques",
    "/Subject": f"Curriculum Vitae ({language})",
    "/Keywords": "CV, resume, software engineer, full-stack",
})
writer.write(sys.stdout.buffer)
