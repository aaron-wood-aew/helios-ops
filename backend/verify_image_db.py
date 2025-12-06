from sqlmodel import Session, select, func
from database import engine, ImageArchive

def check_db():
    with Session(engine) as session:
        count = session.exec(select(func.count(ImageArchive.id))).one()
        print(f"Total Images Archived: {count}")
        
        if count > 0:
            products = session.exec(select(ImageArchive.product).distinct()).all()
            print(f"Products: {products}")
            
            latest = session.exec(select(ImageArchive).order_by(ImageArchive.time_tag.desc()).limit(1)).first()
            print(f"Latest Image: {latest.product} {latest.channel} {latest.time_tag}")

if __name__ == "__main__":
    check_db()
