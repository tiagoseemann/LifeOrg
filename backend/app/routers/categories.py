import re
import unicodedata
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryOut

router = APIRouter(prefix="/api/categories", tags=["categories"])


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


@router.get("", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name).all()


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    slug = slugify(payload.name)
    existing = db.query(Category).filter(Category.name.ilike(payload.name)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Category name already exists")
    cat = Category(name=payload.name, slug=slug, is_default=False)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: str, db: Session = Depends(get_db)):
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if cat.is_default:
        raise HTTPException(status_code=403, detail="Default categories cannot be deleted")
    db.delete(cat)
    db.commit()
