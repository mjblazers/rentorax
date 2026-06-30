"""File uploads to Cloudinary."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from auth import get_current_user
from cloud import upload_bytes, ALLOWED_IMAGE_EXT, ALLOWED_DOC_EXT, MAX_BYTES, cloudinary_available
from db_utils import log_activity

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

ALLOWED_FOLDERS = {
    "properties", "tenants", "tenants/passport", "tenants/id",
    "tenants/agreement", "tenants/documents", "caretakers", "landlord",
    "maintenance", "payments", "expenses", "notices", "settings",
}


@router.post("/file")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Form("misc"),
    user: dict = Depends(get_current_user),
):
    if not cloudinary_available():
        raise HTTPException(503, "File uploads are not configured on the server")

    # Validate file type & size
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext in ALLOWED_IMAGE_EXT:
        resource_type = "image"
    elif ext in ALLOWED_DOC_EXT:
        resource_type = "raw"
    else:
        raise HTTPException(400, f"Unsupported file type: .{ext}")
    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(400, f"File too large (>{MAX_BYTES//1024//1024}MB)")

    safe_folder = folder if folder in ALLOWED_FOLDERS else "misc"
    sub = (user.get("landlord_id") or user.get("_id") or "common")
    full_folder = f"rentorax/{sub}/{safe_folder}"
    try:
        result = upload_bytes(contents, full_folder, file.filename or "", resource_type)
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {e}")
    from server import db
    await log_activity(db, user, "upload_file", "upload", result.get("public_id"), {"folder": safe_folder, "bytes": result.get("bytes")})
    return result
