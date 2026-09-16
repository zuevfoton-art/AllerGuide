#!/usr/bin/env python3
"""Idempotent GlitchTip first admin + RN project.

Reads DJANGO_SUPERUSER_PASSWORD and GLITCHTIP_ADMIN_EMAIL from the
environment. Prints a single ACLARO_DSN=... line to stdout. Never prints
the password. Refuses sentry.io hosts.

Run inside the glitchtip container (WORKDIR /code):
  python3 /tmp/bootstrap-admin.py

BOOTSTRAP_ADMIN_SELFTEST=1 skips Django and checks dsn_is_allowed().
"""

from __future__ import annotations

import os
import sys
from urllib.parse import urlparse

ORG_SLUG = "aclearo-staging"
ORG_NAME = "aclearo-staging"
TEAM_SLUG = "aclearo"
PROJECT_NAME = "mobile"
PROJECT_PLATFORM = "javascript-react-native"
DEFAULT_DSN_HOST = "errors.staging.aclearo.com"
DSN_PREFIX = "ACLARO_DSN="


def dsn_is_allowed(dsn: str, allowed_host: str) -> bool:
    """True only for https://<key>@<allowed_host>/<projectId> (never sentry.io)."""
    if not dsn or not allowed_host:
        return False
    try:
        parts = urlparse(dsn)
    except ValueError:
        return False
    host = (parts.hostname or "").lower()
    if not host:
        return False
    if parts.scheme != "https":
        return False
    if not parts.username:
        return False
    path = (parts.path or "").strip("/")
    if not path:
        return False
    if host == "sentry.io" or host.endswith(".sentry.io"):
        return False
    return host == allowed_host.lower()


def _selftest() -> None:
    allowed = DEFAULT_DSN_HOST
    good = "https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@errors.staging.aclearo.com/1"
    if not dsn_is_allowed(good, allowed):
        raise SystemExit("selftest: expected staging DSN to be allowed")
    rejected = (
        "",
        "https://sentry.io/1",
        "https://key@sentry.io/1",
        "https://key@o1.ingest.sentry.io/1",
        "http://key@errors.staging.aclearo.com/1",
        "https://errors.staging.aclearo.com/1",
        "https://key@errors.staging.aclearo.com/",
        "https://key@evil.example/1",
    )
    for dsn in rejected:
        if dsn_is_allowed(dsn, allowed):
            raise SystemExit(f"selftest: expected reject {dsn!r}")
    print("bootstrap-admin selftest OK", file=sys.stderr)


def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"missing {name}")
    return value


def _ensure_superuser(email: str, password: str):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        return User.objects.create_superuser(
            email=email,
            password=password,
            name="Aclearo staging",
        )
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.set_password(password)
    user.save()
    return user


def _ensure_org_user(org, user):
    from apps.organizations_ext.models import OrganizationUser

    org_user = OrganizationUser.objects.filter(organization=org, user=user).first()
    if org_user is not None:
        return org_user
    return org.add_user(user)


def _ensure_project(org):
    from apps.projects.models import Project

    project = (
        Project.objects.filter(organization=org, name=PROJECT_NAME)
        .order_by("id")
        .first()
    )
    if project is None:
        project = Project(
            organization=org,
            name=PROJECT_NAME,
            platform=PROJECT_PLATFORM,
        )
        project.save()
        return project
    if project.platform != PROJECT_PLATFORM:
        project.platform = PROJECT_PLATFORM
        project.save(update_fields=["platform"])
    return project


def main() -> int:
    email = _require_env("GLITCHTIP_ADMIN_EMAIL")
    password = _require_env("DJANGO_SUPERUSER_PASSWORD")
    allowed_host = os.environ.get("GLITCHTIP_DSN_HOST", DEFAULT_DSN_HOST).strip()
    if not allowed_host:
        allowed_host = DEFAULT_DSN_HOST

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "glitchtip.settings")
    import django

    django.setup()

    from django.db import transaction

    from apps.organizations_ext.models import Organization
    from apps.projects.models import ProjectKey
    from apps.teams.models import Team

    with transaction.atomic():
        org = Organization.objects.filter(slug=ORG_SLUG, is_deleted=False).first()
        if org is None:
            org = Organization(name=ORG_NAME, slug=ORG_SLUG)
            org.save()

        user = _ensure_superuser(email, password)
        org_user = _ensure_org_user(org, user)

        team, _created = Team.objects.get_or_create(
            organization=org,
            slug=TEAM_SLUG,
        )
        team.members.add(org_user)

        project = _ensure_project(org)
        team.projects.add(project)

        key = (
            ProjectKey.objects.filter(project=project, is_active=True)
            .order_by("id")
            .first()
        )
        if key is None:
            key = ProjectKey.objects.create(project=project)

    dsn = key.get_dsn()
    if not dsn_is_allowed(dsn, allowed_host):
        print(
            "bootstrap-admin: DSN host is not "
            f"{allowed_host} (sentry.io is refused)",
            file=sys.stderr,
        )
        return 1

    sys.stdout.write(f"{DSN_PREFIX}{dsn}\n")
    sys.stdout.flush()
    print(
        f"bootstrap-admin: org={ORG_SLUG} team={TEAM_SLUG} "
        f"project={PROJECT_NAME} platform={PROJECT_PLATFORM}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    if os.environ.get("BOOTSTRAP_ADMIN_SELFTEST") == "1":
        _selftest()
        raise SystemExit(0)
    raise SystemExit(main())
