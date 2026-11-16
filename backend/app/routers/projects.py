from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from ..database import get_session
from ..models import Project
from ..schemas import ProjectCreate, ProjectRead, ProjectUpdate
from ..services.git_service import is_valid_git_repo

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _to_read(project: Project) -> ProjectRead:
    return ProjectRead(
        **project.model_dump(),
        git_valid=is_valid_git_repo(project.repo_path),
    )


@router.get("", response_model=list[ProjectRead])
def list_projects(session: Session = Depends(get_session)):
    projects = session.exec(select(Project).order_by(Project.id)).all()
    return [_to_read(p) for p in projects]


@router.post("", response_model=ProjectRead, status_code=201)
def create_project(payload: ProjectCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(Project).where(Project.slug == payload.slug)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um projeto com este slug.")
    project = Project(**payload.model_dump())
    session.add(project)
    session.commit()
    session.refresh(project)
    return _to_read(project)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    session: Session = Depends(get_session),
):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    session.add(project)
    session.commit()
    session.refresh(project)
    return _to_read(project)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    session.delete(project)
    session.commit()

