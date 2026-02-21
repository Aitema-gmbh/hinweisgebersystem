"""
Sanitize uploaded files: strip EXIF metadata from images, clean PDF metadata.
DSGVO-konform: verhindert Re-Identifikation durch GPS, Geraetedaten, Zeitstempel.
"""
import io
from typing import Tuple


def sanitize_image(file_bytes: bytes, content_type: str) -> Tuple[bytes, str]:
    """Remove all EXIF data from JPEG/PNG images."""
    try:
        from PIL import Image

        img = Image.open(io.BytesIO(file_bytes))
        output = io.BytesIO()

        if content_type in ('image/jpeg', 'image/jpg'):
            # Fuer JPEG: Bild ohne EXIF neu speichern
            data = list(img.getdata())
            clean_img = Image.new(img.mode, img.size)
            clean_img.putdata(data)
            clean_img.save(output, format='JPEG', quality=95)
            return output.getvalue(), 'image/jpeg'

        elif content_type == 'image/png':
            # PNG: metadata entfernen
            data = list(img.getdata())
            clean_img = Image.new(img.mode, img.size)
            clean_img.putdata(data)
            clean_img.save(output, format='PNG')
            return output.getvalue(), 'image/png'

        else:
            return file_bytes, content_type

    except Exception as e:
        print(f'Image sanitization failed: {e}')
        return file_bytes, content_type


def sanitize_pdf(file_bytes: bytes) -> bytes:
    """Remove author, creator, and other metadata from PDF."""
    try:
        from pypdf import PdfReader, PdfWriter

        reader = PdfReader(io.BytesIO(file_bytes))
        writer = PdfWriter()

        # Alle Seiten kopieren
        for page in reader.pages:
            writer.add_page(page)

        # Metadaten leeren
        writer.add_metadata({
            '/Author': '',
            '/Creator': '',
            '/Producer': '',
            '/Title': '',
            '/Subject': '',
            '/Keywords': '',
        })

        output = io.BytesIO()
        writer.write(output)
        return output.getvalue()

    except Exception as e:
        print(f'PDF sanitization failed: {e}')
        return file_bytes


def sanitize_file(file_bytes: bytes, filename: str, content_type: str) -> Tuple[bytes, str]:
    """Main entry point: sanitize file based on type."""
    allowed_types = {
        'image/jpeg': sanitize_image,
        'image/jpg': sanitize_image,
        'image/png': sanitize_image,
        'application/pdf': lambda b, ct: (sanitize_pdf(b), ct),
    }

    # Dateigroesse pruefen (max 10MB)
    if len(file_bytes) > 10 * 1024 * 1024:
        raise ValueError('Datei zu gross (max. 10 MB)')

    # Erlaubte Dateitypen
    if content_type not in allowed_types and not filename.lower().endswith(('.jpg', '.jpeg', '.png', '.pdf', '.docx')):
        raise ValueError(f'Dateityp nicht erlaubt: {content_type}')

    sanitizer = allowed_types.get(content_type)
    if sanitizer:
        return sanitizer(file_bytes, content_type)

    return file_bytes, content_type
