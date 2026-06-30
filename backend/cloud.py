"""Cloudinary integration: configure SDK, upload helpers."""
import os
import logging
import cloudinary
import cloudinary.uploader

log = logging.getLogger(__name__)

ALLOWED_IMAGE_EXT = {"jpg", "jpeg", "png", "gif", "webp", "heic", "heif"}
ALLOWED_DOC_EXT = {"pdf", "doc", "docx", "txt"}
MAX_BYTES = 8 * 1024 * 1024  # 8MB

_configured = False


def _configure_once() -> bool:
    global _configured
    if _configured:
        return True
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    api_key = os.environ.get("CLOUDINARY_API_KEY")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET")
    if not (cloud_name and api_key and api_secret):
        log.warning("Cloudinary not configured")
        return False
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )
    _configured = True
    return True


def cloudinary_available() -> bool:
    return _configure_once()


def upload_bytes(contents: bytes, folder: str, filename: str = "", resource_type: str = "auto") -> dict:
    """Upload binary contents to Cloudinary. Returns {secure_url, public_id, resource_type, bytes, format}."""
    if not _configure_once():
        raise RuntimeError("Cloudinary not configured")
    options = {
        "folder": folder,
        "resource_type": resource_type,
        "use_filename": bool(filename),
        "unique_filename": True,
        "overwrite": False,
    }
    if filename:
        options["public_id"] = filename.rsplit(".", 1)[0][:80]
    result = cloudinary.uploader.upload(contents, **options)
    return {
        "secure_url": result.get("secure_url"),
        "public_id": result.get("public_id"),
        "resource_type": result.get("resource_type"),
        "bytes": result.get("bytes"),
        "format": result.get("format"),
        "original_filename": result.get("original_filename") or filename,
    }
