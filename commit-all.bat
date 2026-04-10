@echo off
cd /d C:\workspace_IA\gs-workshop-vaquita

echo === Commit 1: config, db, errors ===
git add src/config.ts src/db/database.ts src/errors/AppError.ts
git commit -m "chore: add project config, db setup and error hierarchy

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

echo === Commit 2: middleware ===
git add src/middleware/errorHandler.ts src/middleware/validate.ts
git commit -m "chore: add zod validation and error handler middleware

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

echo === Commit 3: users module ===
git add src/modules/users/user.repository.ts src/modules/users/user.service.ts src/modules/users/user.router.ts
git commit -m "feat: implement users module (repository, service, router)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

echo === Commit 4: participants module ===
git add src/modules/participants/participant.repository.ts src/modules/participants/participant.service.ts
git commit -m "feat: implement participants module (repository, service)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

echo === Commit 5: contributions module ===
git add src/modules/contributions/contribution.repository.ts src/modules/contributions/contribution.service.ts
git commit -m "feat: implement contributions module (repository, service)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

echo === Commit 6: tandas module ===
git add src/modules/tandas/tanda.repository.ts src/modules/tandas/tanda.service.ts src/modules/tandas/tanda.router.ts
git commit -m "feat: implement tandas module with business rules

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

echo === Commit 7: app entry point ===
git add src/app.ts src/index.ts
git commit -m "feat: add express app factory and entry point

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

echo === Commit 8: tests ===
git add src/users.test.ts src/tandas.test.ts src/contributions.test.ts
git commit -m "test: add supertest integration tests for all endpoints

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

echo === Commit 9: README ===
git add README.md
git commit -m "docs: update README with full API description and architecture

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

echo === Commit 10: observations ===
git add OBSERVATIONS.md
git commit -m "obs: add session observations and design decision log

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

echo.
echo === Git log (last 12 commits) ===
git log --oneline -12

echo.
echo === DONE. Push with: ===
echo git push origin participant/PXXX
pause
